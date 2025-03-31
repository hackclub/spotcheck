namespace :airtable do
  desc "Fetch and print Airtable schemas for Approved Projects & YSWS Programs"
  task fetch_schemas: :environment do
    airtable = AirtableService.instance

    puts "\nApproved Projects Schema:"
    puts "========================="
    approved_projects_schema = airtable.get_table_schema("Approved Projects")
    puts JSON.pretty_generate(approved_projects_schema)

    puts "\n\nYSWS Programs Schema:"
    puts "===================="
    programs_schema = airtable.get_table_schema("YSWS Programs")
    puts JSON.pretty_generate(programs_schema)

    puts "\n\nYSWS Spot Checks Schema:"
    puts "===================="
    spot_checks_schema = airtable.get_table_schema("YSWS Spot Checks")
    puts JSON.pretty_generate(spot_checks_schema)

    puts "\n\nYSWS Spot Check Sessions Schema:"
    puts "===================="
    spot_check_sessions_schema = airtable.get_table_schema("YSWS Spot Check Sessions")
    puts JSON.pretty_generate(spot_check_sessions_schema)
  end
end 