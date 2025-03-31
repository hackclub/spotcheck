class AddScreenshotToYswsApprovedProjects < ActiveRecord::Migration[8.0]
  def change
    add_column :ysws_approved_projects, :screenshot, :jsonb
  end
end
