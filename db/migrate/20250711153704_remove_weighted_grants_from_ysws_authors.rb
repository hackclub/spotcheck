class RemoveWeightedGrantsFromYswsAuthors < ActiveRecord::Migration[8.0]
  def change
    remove_column :ysws_authors, :weighted_grants_this_month, :integer
    remove_column :ysws_authors, :weighted_grants_last_month, :integer
    remove_column :ysws_authors, :weighted_grants_2024, :integer
    remove_column :ysws_authors, :weighted_grants_2025, :integer
    remove_column :ysws_authors, :weighted_grants_total, :integer
    remove_column :ysws_authors, :weights_grants_oct_2024, :integer
    remove_column :ysws_authors, :weights_grants_nov_2024, :integer
    remove_column :ysws_authors, :weights_grants_dec_2024, :integer
    remove_column :ysws_authors, :weights_grants_jan_2025, :integer
    remove_column :ysws_authors, :weights_grants_feb_2025, :integer
    remove_column :ysws_authors, :weights_grants_mar_2025, :integer
    remove_column :ysws_authors, :weights_grants_sep_2024, :integer
  end
end
