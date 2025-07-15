class CreateYswsAuthors < ActiveRecord::Migration[8.0]
  def change
    create_table :ysws_authors, primary_key: :airtable_id, id: :string do |t|
      t.string :name
      t.integer :weighted_grants_this_month
      t.integer :weighted_grants_last_month
      t.integer :weighted_grants_2024
      t.integer :weighted_grants_2025
      t.integer :weighted_grants_total
      t.integer :weights_grants_oct_2024
      t.integer :weights_grants_nov_2024
      t.integer :weights_grants_dec_2024
      t.integer :weights_grants_jan_2025
      t.integer :weights_grants_feb_2025
      t.integer :weights_grants_mar_2025
      t.integer :weights_grants_sep_2024
      t.string :slack_id
      t.jsonb :current_ysws_programs
      t.jsonb :attributed_grants
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end

    add_index :ysws_authors, :name
    add_index :ysws_authors, :slack_id
  end
end
