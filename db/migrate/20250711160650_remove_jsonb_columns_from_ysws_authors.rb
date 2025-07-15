class RemoveJsonbColumnsFromYswsAuthors < ActiveRecord::Migration[8.0]
  def change
    remove_column :ysws_authors, :current_ysws_programs, :jsonb
    remove_column :ysws_authors, :attributed_grants, :jsonb
  end
end
