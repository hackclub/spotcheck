module Ysws
  class Program < ApplicationRecord
    self.primary_key = 'airtable_id'

    has_many :approved_projects,
             class_name: 'Ysws::ApprovedProject',
             foreign_key: :ysws_program_id,
             dependent: :nullify

    # Rails associations for authors
    has_many :author_programs, class_name: 'Ysws::AuthorProgram', foreign_key: :program_id, dependent: :destroy
    has_many :current_authors, through: :author_programs, source: :author
    
    # Returns authors who have grants attributed to projects in this program
    def project_authors
      project_ids = approved_projects.pluck(:airtable_id)
      return Ysws::Author.none if project_ids.empty?
      
      Ysws::Author.joins(:author_approved_projects)
                  .where(ysws_author_approved_projects: { approved_project_id: project_ids })
                  .distinct
    end

    # Returns a hash containing review status information for a given time period
    # @param time_period [Range] Optional date range to check (default: all time)
    # @return [Hash] containing :needs_more_reviews, :reviewed_count, :total_count, and :percentage
    def review_status(time_period = nil)
      projects = approved_projects
      projects = projects.where(approved_at: time_period) if time_period.present?

      total_project_count = projects.count
      return { needs_more_reviews: false, reviewed_count: 0, total_count: 0, percentage: 0 } if total_project_count.zero?

      # Get count of unique projects that have been reviewed
      reviewed_projects_count = projects
        .joins(spot_checks: :spot_check_session)
        .where.not(ysws_spot_checks: { airtable_id: nil })
        .distinct
        .count

      # Formula: MAX(MIN(total_project_count, 5), 10% of projects)
      minimum_reviews_required = [
        [total_project_count, 5].min,
        (total_project_count * 0.1).ceil
      ].max

      percentage = (reviewed_projects_count.to_f / total_project_count * 100).round

      {
        needs_more_reviews: reviewed_projects_count < minimum_reviews_required,
        reviewed_count: reviewed_projects_count,
        total_count: total_project_count,
        percentage: percentage
      }
    end

    # Convenience method that returns just the needs_more_reviews boolean
    # @param time_period [Range] Optional date range to check (default: all time)
    # @return [Boolean] true if more reviews are needed, false if sufficient
    def needs_more_reviews?(time_period = nil)
      review_status(time_period)[:needs_more_reviews]
    end
  end
end
