class AddAccessTokenToAuthorizedUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :authorized_users, :access_token, :text
  end
end
