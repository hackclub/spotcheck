module Ysws
  class PullFromAirtable < ApplicationJob
    queue_as :default

    def perform
      airtable = AirtableService.instance
      
      # Use a single transaction for the entire import to ensure consistency
      ActiveRecord::Base.transaction do
        # Clear association tables first (due to foreign key constraints)
        Ysws::AuthorProgram.delete_all
        Ysws::AuthorApprovedProject.delete_all
        
        # Then delete all existing records
        Ysws::SpotCheck.delete_all
        Ysws::SpotCheckSession.delete_all
        Ysws::ApprovedProject.delete_all
        Ysws::Program.delete_all
        Ysws::Author.delete_all
        
        # Import programs first
        import_programs(airtable)
        
        # Import projects with program associations (before authors, so author associations can reference them)
        import_projects(airtable)
        
        # Then import authors with project/program associations
        import_authors(airtable)

        # Import spot check sessions
        import_spot_check_sessions(airtable)

        # Finally import spot checks with session associations
        import_spot_checks(airtable)
      end
    end

    private

    def import_programs(airtable)
      offset = nil
      records_to_insert = []
      
      # Process page by page
      loop do
        response = airtable.list_records(Rails.application.credentials.airtable.ysws.table_id.ysws_programs, offset: offset)
        
        response["records"].each do |record|
          fields = sanitize_fields(record["fields"])
          records_to_insert << {
            airtable_id: record["id"],
            name: fields["Name"],
            average_hours_per_grant: fields["Average Hours Per Grant"],
            nps_score: fields["NPS Score"],
            nps_median_estimated_hours: fields["NPS–Median Estimated Hours"],
            icon_cdn_link: fields["Icon – CDN Link"],
            created_at: Time.current,
            updated_at: Time.current
          }
        end

        offset = response["offset"]
        break unless offset
      end

      Ysws::Program.insert_all!(records_to_insert) if records_to_insert.any?
    end

    def import_projects(airtable)
      offset = nil
      records_to_insert = []
      
      # Process page by page
      loop do
        response = airtable.list_records(Rails.application.credentials.airtable.ysws.table_id.approved_projects, offset: offset)
        
        response["records"].each do |record|
          fields = sanitize_fields(record["fields"])
          
          # Get the program ID from the YSWS field (which is a link to the Programs table)
          program_id = fields["YSWS"]&.first

          # Handle the Hours Spent field, which can be an array or a single value
          hours = fields["Hours Spent"]
          if hours.is_a?(Array)
            hours = hours.first
          else
            hours = hours.to_i
          end

          records_to_insert << {
            airtable_id: record["id"],
            email: fields["Email"],
            referral_reason: fields["Referral Reason"],
            heard_about: fields["How did you hear about this?"],
            doing_well_feedback: fields["What are we doing well?"],
            improvement_feedback: fields["How can we improve?"],
            age_when_approved: fields["Age When Approved"],
            playable_url: fields["Playable URL"],
            code_url: fields["Code URL"],
            description: fields["Description"],
            github_username: fields["GitHub Username"],
            address_line1: fields["Address (Line 1)"],
            address_line2: fields["Address (Line 2)"],
            city: fields["City"],
            state_province: fields["State / Province"],
            country: fields["Country"],
            postal_code: fields["ZIP / Postal Code"],
            birthday: fields["Birthday"],
            hours_spent: hours,
            override_hours_spent: fields["Override Hours Spent"],
            override_hours_spent_justification: fields["Override Hours Spent Justification"],
            weighted_project_contribution: fields["YSWS–Weighted Project Contribution"],
            approved_at: fields["Approved At"],
            created_at: fields["Created"] || Time.current,
            first_name: fields["First Name"],
            last_name: fields["Last Name"],
            weighted_project_contribution_per_author: fields["YSWS–Weighted Project Contribution Per Author"],
            author_countries: fields["Author countries"],
            unique_countries: fields["Unique countries"],
            archive_live_url: fields["Archive - Live URL"],
            archive_code_url: fields["Archive - Code URL"],
            archive_archived_at: fields["Archive - Archived At"],
            archive_trigger_rearchive: fields["Archive - Trigger Rearchive"],
            archive_trigger_rearchive2: fields["Archive - Trigger Rearchive 2"],
            hack_clubber_geocoded_country: fields["Hack Clubber–Geocoded Country"],
            ysws_program_id: program_id,
            screenshot: fields["Screenshot"],
            updated_at: Time.current
          }
        end

        offset = response["offset"]
        break unless offset
      end

      Ysws::ApprovedProject.insert_all!(records_to_insert) if records_to_insert.any?
    end

    def import_spot_check_sessions(airtable)
      offset = nil
      records_to_insert = []
      
      # Process page by page
      loop do
        response = airtable.list_records(Rails.application.credentials.airtable.ysws.table_id.spot_check_sessions, offset: offset)
        
        response["records"].each do |record|
          fields = sanitize_fields(record["fields"])
          
          # Parse the JSON filters from Airtable
          filters = begin
            JSON.parse(fields["Filters"]) if fields["Filters"].present?
          rescue JSON::ParserError
            {} # Default to empty hash if JSON is invalid
          end

          records_to_insert << {
            airtable_id: record["id"],
            filters: filters || {},
            sampling_strategy: fields["Sampling Strategy"]&.downcase,
            creator_name: fields["Creator Name"],
            creator_slack_id: fields["Creator Slack ID"],
            creator_email: fields["Creator Email"],
            creator_avatar_url: fields["Creator Avatar URL"],
            start_time: fields["Start Time"],
            end_time: fields["End Time"],
            created_at: record["createdTime"] || Time.current,
            updated_at: Time.current
          }
        end

        offset = response["offset"]
        break unless offset
      end

      Ysws::SpotCheckSession.insert_all!(records_to_insert) if records_to_insert.any?
    end

    def import_spot_checks(airtable)
      offset = nil
      records_to_insert = []
      
      # Process page by page
      loop do
        response = airtable.list_records(Rails.application.credentials.airtable.ysws.table_id.spot_checks, offset: offset)
        
        response["records"].each do |record|
          fields = sanitize_fields(record["fields"])
          
          # Get the project ID from the Project field (which is a link to the Approved Projects table)
          project_id = fields["Project"]&.first
          session_id = fields["Spot Check Session"]&.first

          next unless project_id # Skip if no project association

          records_to_insert << {
            airtable_id: record["id"],
            approved_project_id: project_id,
            assessment: Ysws::SpotCheck.assessment_from_airtable(fields["Assessment"]),
            notes: fields["Notes For YSWS Authors"],
            reviewer_slack_id: fields["Reviewer Slack ID"],
            reviewer_name: fields["Reviewer Name"],
            reviewer_email: fields["Reviewer Email"],
            reviewer_avatar_url: fields["Reviewer Avatar URL"],
            start_time: fields["Duration - Start Time"],
            end_time: fields["Duration - End Time"],
            spot_check_session_id: session_id,
            created_at: record["createdTime"] || Time.current,
            updated_at: Time.current
          }
        end

        offset = response["offset"]
        break unless offset
      end

      Ysws::SpotCheck.insert_all!(records_to_insert) if records_to_insert.any?
    end

    def import_authors(airtable)
      offset = nil
      records_to_insert = []
      author_associations = { programs: [], approved_projects: [] }
      
      # Process page by page
      loop do
        response = airtable.list_records("tblRf1BQs5H8298gW", offset: offset)
        
        response["records"].each do |record|
          fields = sanitize_fields(record["fields"])
          
          records_to_insert << {
            airtable_id: record["id"],
            name: fields["Name"],
            slack_url: fields["Slack URL"],
            created_at: Time.current,
            updated_at: Time.current
          }
          
          # Store associations to create after authors are inserted
          author_id = record["id"]
          
          # Program associations
          if fields["Current YSWS Programs"].present?
            fields["Current YSWS Programs"].each do |program_id|
              author_associations[:programs] << {
                author_id: author_id,
                program_id: program_id,
                created_at: Time.current,
                updated_at: Time.current
              }
            end
          end
          
          # Approved project associations
          if fields["Attributed Grants"].present?
            fields["Attributed Grants"].each do |project_id|
              author_associations[:approved_projects] << {
                author_id: author_id,
                approved_project_id: project_id,
                created_at: Time.current,
                updated_at: Time.current
              }
            end
          end
        end

        offset = response["offset"]
        break unless offset
      end

      # Insert authors first
      Ysws::Author.insert_all!(records_to_insert) if records_to_insert.any?
      
      # Filter associations to only include existing programs and projects
      existing_programs = Ysws::Program.pluck(:airtable_id).to_set
      existing_projects = Ysws::ApprovedProject.pluck(:airtable_id).to_set
      
      valid_program_associations = author_associations[:programs].select { |assoc| existing_programs.include?(assoc[:program_id]) }
      valid_project_associations = author_associations[:approved_projects].select { |assoc| existing_projects.include?(assoc[:approved_project_id]) }
      
      # Then insert valid associations
      Ysws::AuthorProgram.insert_all!(valid_program_associations) if valid_program_associations.any?
      Ysws::AuthorApprovedProject.insert_all!(valid_project_associations) if valid_project_associations.any?
    end

    def sanitize_fields(fields)
      fields.transform_values do |value|
        case value
        when String
          value.delete("\u0000")  # Remove null bytes
        when Array
          value.map { |v| v.is_a?(String) ? v.delete("\u0000") : v }
        else
          value
        end
      end
    end
  end
end
