class ChangeSamplingStrategyToStringInYswsSpotCheckSessions < ActiveRecord::Migration[8.0]
  def up
    # Add a temporary column to store the string values
    add_column :ysws_spot_check_sessions, :sampling_strategy_str, :string

    # Update the temporary column with string values based on integer values
    execute <<-SQL
      UPDATE ysws_spot_check_sessions
      SET sampling_strategy_str = CASE sampling_strategy
        WHEN 0 THEN 'random'
        WHEN 1 THEN 'highest_hours'
        ELSE 'random'
      END;
    SQL

    # Remove the old integer column
    remove_column :ysws_spot_check_sessions, :sampling_strategy

    # Add the new string column with the values from the temporary column
    add_column :ysws_spot_check_sessions, :sampling_strategy, :string, default: 'random'

    # Copy values from temporary column
    execute <<-SQL
      UPDATE ysws_spot_check_sessions
      SET sampling_strategy = sampling_strategy_str;
    SQL

    # Remove the temporary column
    remove_column :ysws_spot_check_sessions, :sampling_strategy_str
  end

  def down
    # Add a temporary column to store integer values
    add_column :ysws_spot_check_sessions, :sampling_strategy_int, :integer

    # Update the temporary column with integer values based on string values
    execute <<-SQL
      UPDATE ysws_spot_check_sessions
      SET sampling_strategy_int = CASE sampling_strategy
        WHEN 'random' THEN 0
        WHEN 'highest_hours' THEN 1
        ELSE 0
      END;
    SQL

    # Remove the string column
    remove_column :ysws_spot_check_sessions, :sampling_strategy

    # Add back the integer column with the values from the temporary column
    add_column :ysws_spot_check_sessions, :sampling_strategy, :integer, default: 0

    # Copy values from temporary column
    execute <<-SQL
      UPDATE ysws_spot_check_sessions
      SET sampling_strategy = sampling_strategy_int;
    SQL

    # Remove the temporary column
    remove_column :ysws_spot_check_sessions, :sampling_strategy_int
  end
end
