class AddAirtableIdToYswsSpotCheckSessions < ActiveRecord::Migration[8.0]
  def up
    # Add airtable_id column initially as nullable
    add_column :ysws_spot_check_sessions, :airtable_id, :string

    # Temporarily generate UUIDs for existing records
    execute <<-SQL
      UPDATE ysws_spot_check_sessions 
      SET airtable_id = 'temp_' || id::text 
      WHERE airtable_id IS NULL
    SQL

    # Now we can safely make it not null and unique
    change_column_null :ysws_spot_check_sessions, :airtable_id, false
    add_index :ysws_spot_check_sessions, :airtable_id, unique: true

    # Remove foreign key constraint from spot_checks
    remove_foreign_key :ysws_spot_checks, :ysws_spot_check_sessions

    # First change spot_check_session_id to string
    change_column :ysws_spot_checks, :spot_check_session_id, :string, using: 'spot_check_session_id::text'

    # Now we can update the references
    execute <<-SQL
      UPDATE ysws_spot_checks sc
      SET spot_check_session_id = scs.airtable_id
      FROM ysws_spot_check_sessions scs
      WHERE sc.spot_check_session_id = scs.id::text
    SQL

    # Add new foreign key constraint
    add_foreign_key :ysws_spot_checks, :ysws_spot_check_sessions,
                   column: :spot_check_session_id,
                   primary_key: :airtable_id

    # Now we can safely change the primary key
    execute "ALTER TABLE ysws_spot_check_sessions DROP CONSTRAINT ysws_spot_check_sessions_pkey"
    execute "ALTER TABLE ysws_spot_check_sessions ADD PRIMARY KEY (airtable_id)"
    remove_column :ysws_spot_check_sessions, :id
  end

  def down
    # Add back the id column as primary key
    add_column :ysws_spot_check_sessions, :id, :serial, primary_key: true

    # Remove foreign key constraint
    remove_foreign_key :ysws_spot_checks, :ysws_spot_check_sessions

    # Update spot_checks to use numeric id again
    execute <<-SQL
      UPDATE ysws_spot_checks sc
      SET spot_check_session_id = scs.id::text
      FROM ysws_spot_check_sessions scs
      WHERE sc.spot_check_session_id = scs.airtable_id
    SQL

    # Change spot_check_session_id back to bigint
    change_column :ysws_spot_checks, :spot_check_session_id, :bigint, using: 'spot_check_session_id::bigint'

    # Add back original foreign key constraint
    add_foreign_key :ysws_spot_checks, :ysws_spot_check_sessions

    # Remove airtable_id index and column
    remove_index :ysws_spot_check_sessions, :airtable_id
    remove_column :ysws_spot_check_sessions, :airtable_id
  end
end
