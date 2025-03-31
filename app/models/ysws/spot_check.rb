module Ysws
  class SpotCheck < ApplicationRecord
    self.primary_key = :airtable_id

    belongs_to :approved_project, class_name: 'Ysws::ApprovedProject', foreign_key: :approved_project_id, primary_key: :airtable_id
    belongs_to :spot_check_session, class_name: 'Ysws::SpotCheckSession', optional: true

    validates :assessment, presence: true
    validates :notes, presence: true, if: :requires_notes?
    validates :reviewer_slack_id, presence: true
    validates :reviewer_name, presence: true
    validates :reviewer_email, presence: true
    validates :reviewer_avatar_url, presence: true
    validates :start_time, presence: true
    
    # Skip airtable_id validation during creation
    validates :airtable_id, presence: true, on: :update
    
    # Set end time before creating Airtable record
    before_validation :set_end_time, on: :create
    
    # Use after_validation callback to create Airtable record only if validations pass
    after_validation :create_airtable_record, on: :create, if: -> { errors.empty? }

    enum :assessment, { red: 'red', yellow: 'yellow', green: 'green' }

    def requires_notes?
      %w[yellow red].include?(assessment)
    end

    def duration
      return nil if start_time.nil? || end_time.nil?
      end_time - start_time
    end

    def approved?
      assessment == 'green'
    end

    def self.assessment_from_airtable(value)
      case value
      when 'Green - Looks Good!' then 'green'
      when "Yellow - Something's Wrong" then 'yellow'
      when 'Red - Remove Project' then 'red'
      else
        raise ArgumentError, "Unknown Airtable assessment value: #{value}"
      end
    end

    private

    def set_end_time
      self.end_time = Time.current unless end_time
    end

    def airtable_assessment_value
      case assessment
      when 'green' then 'Green - Looks Good!'
      when 'yellow' then 'Yellow - Something\'s Wrong'
      when 'red' then 'Red - Remove Project'
      end
    end

    def create_airtable_record
      table_id = Rails.application.credentials.airtable.ysws.table_id.spot_checks
      response = AirtableService.instance.create_record(
        table_id,
        {
          'Project' => [approved_project.airtable_id],
          'Assessment' => airtable_assessment_value,
          'Notes For YSWS Authors' => notes,
          'Reviewer Slack ID' => reviewer_slack_id,
          'Reviewer Name' => reviewer_name,
          'Reviewer Email' => reviewer_email,
          'Reviewer Avatar URL' => reviewer_avatar_url,
          'Duration - Start Time' => start_time&.iso8601,
          'Duration - End Time' => end_time&.iso8601,
          'Spot Check Session' => spot_check_session ? [spot_check_session.airtable_id] : nil
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
