module Ysws
  class Author < ApplicationRecord
    self.primary_key = 'airtable_id'

    # Basic validations
    validates :airtable_id, presence: true

    # Rails associations for programs
    has_many :author_programs, class_name: 'Ysws::AuthorProgram', foreign_key: :author_id, dependent: :destroy
    has_many :ysws_programs, through: :author_programs, source: :program

    # Rails associations for approved projects
    has_many :author_approved_projects, class_name: 'Ysws::AuthorApprovedProject', foreign_key: :author_id, dependent: :destroy
    has_many :attributed_projects, through: :author_approved_projects, source: :approved_project

    # Alias for backwards compatibility (used in codebase)
    def approved_projects
      attributed_projects
    end

    # Check if author is associated with a specific program
    def associated_with_program?(program_id)
      ysws_programs.exists?(airtable_id: program_id.to_s)
    end

    # Check if author is attributed to a specific grant/project
    def attributed_to_project?(project_id)
      attributed_projects.exists?(airtable_id: project_id.to_s)
    end

    # Extract Slack user ID from Slack URL
    # Format: https://hackclub.slack.com/team/U01G0Q9K998
    # Returns: U01G0Q9K998
    def slack_id
      return nil unless slack_url.present?
      
      # Extract the user ID from the URL path
      slack_url.split('/').last
    end
  end
end
