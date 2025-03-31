module Ysws
  class ApprovedProject < ApplicationRecord
    self.primary_key = 'airtable_id'

    belongs_to :ysws_program,
               class_name: 'Ysws::Program',
               optional: true

    has_many :spot_checks,
             class_name: 'Ysws::SpotCheck',
             foreign_key: :approved_project_id,
             primary_key: :airtable_id

    def screenshot_thumbnail_urls
      return [] unless screenshot.is_a?(Array)

      screenshot.map do |screenshot_item|
        thumbnail = screenshot_item.dig('thumbnails', 'large')
        next unless thumbnail
        {
          url: thumbnail['url'],
          width: thumbnail['width'],
          height: thumbnail['height']
        }
      end.compact
    end
  end
end
