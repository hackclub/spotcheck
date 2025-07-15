class RenameSlackIdToSlackUrlInYswsAuthors < ActiveRecord::Migration[8.0]
  def change
    rename_column :ysws_authors, :slack_id, :slack_url
  end
end
