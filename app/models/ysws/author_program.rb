module Ysws
  class AuthorProgram < ApplicationRecord
    belongs_to :author, class_name: 'Ysws::Author', foreign_key: :author_id, primary_key: :airtable_id
    belongs_to :program, class_name: 'Ysws::Program', foreign_key: :program_id, primary_key: :airtable_id

    validates :author_id, presence: true
    validates :program_id, presence: true
    validates :author_id, uniqueness: { scope: :program_id }
  end
end
