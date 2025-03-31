class RemoveNullConstraintsFromYswsSpotChecks < ActiveRecord::Migration[8.0]
  def change
    change_column_null :ysws_spot_checks, :approved_project_id, true
    change_column_null :ysws_spot_checks, :assessment, true
    change_column_null :ysws_spot_checks, :reviewer_slack_id, true
    change_column_null :ysws_spot_checks, :reviewer_name, true
    change_column_null :ysws_spot_checks, :reviewer_email, true
    change_column_null :ysws_spot_checks, :reviewer_avatar_url, true
  end
end
