module Ysws
  class AuthorApprovedProject < ApplicationRecord
    belongs_to :author, class_name: 'Ysws::Author', foreign_key: :author_id, primary_key: :airtable_id
    belongs_to :approved_project, class_name: 'Ysws::ApprovedProject', foreign_key: :approved_project_id, primary_key: :airtable_id

    validates :author_id, presence: true
    validates :approved_project_id, presence: true
    validates :author_id, uniqueness: { scope: :approved_project_id }
  end
end
