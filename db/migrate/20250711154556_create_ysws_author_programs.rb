class CreateYswsAuthorPrograms < ActiveRecord::Migration[8.0]
  def change
    create_table :ysws_author_programs do |t|
      t.string :author_id, null: false
      t.string :program_id, null: false

      t.timestamps
    end

    add_index :ysws_author_programs, [:author_id, :program_id], unique: true
    add_index :ysws_author_programs, :author_id
    add_index :ysws_author_programs, :program_id
    
    add_foreign_key :ysws_author_programs, :ysws_authors, column: :author_id, primary_key: :airtable_id
    add_foreign_key :ysws_author_programs, :ysws_programs, column: :program_id, primary_key: :airtable_id
  end
end
