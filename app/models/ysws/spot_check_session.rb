module Ysws
  class SpotCheckSession < ApplicationRecord
    self.primary_key = :airtable_id

    enum :sampling_strategy, {
      random: 'random',
      highest_hours: 'highest_hours'
    }, default: 'random'

    validates :filters, presence: true
    validates :creator_slack_id, presence: true
    validates :creator_name, presence: true
    validates :creator_email, presence: true
    validates :creator_avatar_url, presence: true
    validates :start_time, presence: true
    validate :validate_custom_date_range

    # Skip airtable_id validation during creation
    validates :airtable_id, presence: true, on: :update

    has_many :spot_checks, dependent: :nullify

    # Create Airtable record after validation passes
    after_validation :create_airtable_record, on: :create, if: -> { errors.empty? }

    def duration
      return nil if start_time.nil? || end_time.nil?
      end_time - start_time
    end

    def completed_spot_checks_count
      spot_checks.count
    end

    def total_time_spent
      return 0 if spot_checks.empty?
      spot_checks.sum { |check| (check.end_time - check.start_time) if check.end_time && check.start_time }.to_i
    end

    def formatted_total_time
      total = total_time_spent
      hours = total / 3600
      minutes = (total % 3600) / 60
      seconds = total % 60
      
      if hours > 0
        "#{hours}h #{minutes}m"
      elsif minutes > 0
        "#{minutes}m #{seconds}s"
      else
        "#{seconds}s"
      end
    end

    def remaining_projects_count
      base_query = Ysws::ApprovedProject.includes(:ysws_program)
      
      # Apply filters based on creation time
      case filters["timeframe"]
      when "24h"
        base_query = base_query.where("approved_at > ? AND approved_at <= ? AND approved_at IS NOT NULL", 
          start_time - 24.hours, 
          start_time)
      when "7d"
        base_query = base_query.where("approved_at > ? AND approved_at <= ? AND approved_at IS NOT NULL", 
          start_time - 7.days, 
          start_time)
      when "30d"
        base_query = base_query.where("approved_at > ? AND approved_at <= ? AND approved_at IS NOT NULL", 
          start_time - 30.days, 
          start_time)
      when "recent_100"
        # For recent 100, we need to find the 100 most recent projects before the session start time
        base_query = base_query
          .where("approved_at <= ? AND approved_at IS NOT NULL", start_time)
          .order(approved_at: :desc)
          .limit(100)
      when "custom"
        base_query = base_query.where("approved_at IS NOT NULL")
        if filters["start_date"].present?
          start_date = Time.zone.parse(filters["start_date"]).beginning_of_day
          base_query = base_query.where("approved_at >= ?", start_date)
        end
        if filters["end_date"].present?
          end_date = Time.zone.parse(filters["end_date"]).end_of_day
          base_query = base_query.where("approved_at <= ?", end_date)
        end
      end

      # Apply program filter if specified and not empty
      if filters["ysws_program_ids"].present? && filters["ysws_program_ids"].reject(&:blank?).any?
        base_query = base_query.where(ysws_program_id: filters["ysws_program_ids"].reject(&:blank?))
      end

      # Get the total count of projects that matched at creation time
      total_matching_projects = base_query.count

      # Subtract the number of projects we've already reviewed in this session
      total_matching_projects - completed_spot_checks_count
    end

    def formatted_filters
      parts = []
      
      # Add timeframe
      timeframe_text = case filters["timeframe"]
      when "24h" then "Past 24 hours"
      when "7d" then "Past 7 days"
      when "30d" then "Past 30 days"
      when "recent_100" then "Most recent 100"
      when "all" then "All time"
      when "custom"
        start_date = filters["start_date"].present? ? Date.parse(filters["start_date"]).strftime("%b %d") : "?"
        end_date = filters["end_date"].present? ? Date.parse(filters["end_date"]).strftime("%b %d") : "?"
        "#{start_date} to #{end_date}"
      end
      parts << timeframe_text if timeframe_text

      # Add sampling strategy
      parts << sampling_strategy.humanize

      # Add program names if filtered
      if filters["ysws_program_ids"].present? && filters["ysws_program_ids"].reject(&:blank?).any?
        program_names = Ysws::Program.where(airtable_id: filters["ysws_program_ids"].reject(&:blank?)).pluck(:name)
        parts << "Programs: #{program_names.join(", ")}"
      else
        parts << "All programs"
      end

      parts.join(" • ")
    end

    def status
      if end_time.present?
        "Completed"
      elsif spot_checks.any?
        "In Progress"
      else
        "Not Started"
      end
    end

    def find_next_project
      base_query = Ysws::ApprovedProject.includes(:ysws_program)

      Rails.logger.debug "SpotCheckSession#find_next_project - Initial count: #{base_query.count}"
      Rails.logger.debug "SpotCheckSession#find_next_project - Filters: #{filters.inspect}"
      Rails.logger.debug "SpotCheckSession#find_next_project - Sampling strategy: #{sampling_strategy}"

      # Apply timeframe filter
      Rails.logger.debug "SpotCheckSession#find_next_project - Applying timeframe filter: #{filters["timeframe"]}"
      
      case filters["timeframe"]
      when "24h"
        base_query = base_query.where("approved_at > ? AND approved_at IS NOT NULL", 24.hours.ago)
      when "7d"
        base_query = base_query.where("approved_at > ? AND approved_at IS NOT NULL", 7.days.ago)
      when "30d"
        base_query = base_query.where("approved_at > ? AND approved_at IS NOT NULL", 30.days.ago)
      when "recent_100"
        base_query = base_query.where("approved_at IS NOT NULL").order(approved_at: :desc).limit(100)
      when "custom"
        base_query = base_query.where("approved_at IS NOT NULL")
        if filters["start_date"].present?
          start_time = Time.zone.parse(filters["start_date"]).beginning_of_day
          base_query = base_query.where("approved_at >= ?", start_time)
        end
        if filters["end_date"].present?
          end_time = Time.zone.parse(filters["end_date"]).end_of_day
          base_query = base_query.where("approved_at <= ?", end_time)
        end
      when "all"
        # No filter needed
      else
        Rails.logger.warn "SpotCheckSession#find_next_project - Unknown timeframe filter: #{filters["timeframe"]}"
      end

      Rails.logger.debug "SpotCheckSession#find_next_project - SQL after timeframe filter: #{base_query.to_sql}"

      # Apply program filter if specified
      program_ids = Array(filters["ysws_program_ids"]).reject(&:blank?)
      if program_ids.present?
        base_query = base_query.where(ysws_program_id: program_ids)
        Rails.logger.debug "SpotCheckSession#find_next_project - After program filter count: #{base_query.count}"
      end

      # Exclude already reviewed projects in this session
      reviewed_project_ids = spot_checks.pluck(:approved_project_id)
      if reviewed_project_ids.any?
        base_query = base_query.where.not(airtable_id: reviewed_project_ids)
        Rails.logger.debug "SpotCheckSession#find_next_project - After excluding reviewed projects count: #{base_query.count}"
      end

      # Apply sampling strategy
      case sampling_strategy.to_s
      when "random"
        if filters["timeframe"] == "recent_100"
          # For recent 100, we want to randomly select from the already limited set
          base_query.order("RANDOM()").first
        else
          # For other cases, we want to randomly select from the filtered set
          base_query.order("RANDOM()").first
        end
      when "highest_hours"
        Rails.logger.debug "SpotCheckSession#find_next_project - Projects by hours: #{base_query.pluck(:hours_spent, :airtable_id)}"
        next_project = base_query.order(hours_spent: :desc).first
        Rails.logger.debug "SpotCheckSession#find_next_project - Selected project: #{next_project&.inspect}"
        next_project
      end
    end

    private

    def validate_custom_date_range
      return unless filters.present? && filters["timeframe"] == "custom"

      if filters["start_date"].present? && filters["end_date"].present?
        start_date = filters["start_date"].to_date
        end_date = filters["end_date"].to_date
        
        if end_date < start_date
          errors.add(:filters, "End date must be after start date")
        end
      elsif filters["start_date"].present? || filters["end_date"].present?
        errors.add(:filters, "Both start date and end date must be provided for custom range")
      end
    end

    def create_airtable_record
      table_id = Rails.application.credentials.airtable.ysws.table_id.spot_check_sessions
      response = AirtableService.instance.create_record(
        table_id,
        {
          'Filters' => filters.to_json,
          'Sampling Strategy' => sampling_strategy,
          'Creator Name' => creator_name,
          'Creator Slack ID' => creator_slack_id,
          'Creator Email' => creator_email,
          'Creator Avatar URL' => creator_avatar_url,
          'Start Time' => start_time&.iso8601,
          'End Time' => end_time&.iso8601
        }
      )

      if response['error']
        errors.add(:base, "Error creating Airtable record: #{response['error']}")
        return false
      end

      self.airtable_id = response['id']
      true
    end
  end
end 