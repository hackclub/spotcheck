class CreateYswsAuthorApprovedProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :ysws_author_approved_projects do |t|
      t.string :author_id, null: false
      t.string :approved_project_id, null: false

      t.timestamps
    end

    add_index :ysws_author_approved_projects, [:author_id, :approved_project_id], unique: true, name: 'index_ysws_author_approved_projects_on_author_and_project'
    add_index :ysws_author_approved_projects, :author_id
    add_index :ysws_author_approved_projects, :approved_project_id
    
    add_foreign_key :ysws_author_approved_projects, :ysws_authors, column: :author_id, primary_key: :airtable_id
    add_foreign_key :ysws_author_approved_projects, :ysws_approved_projects, column: :approved_project_id, primary_key: :airtable_id
  end
end
