module Ysws
  class ReloadsController < ApplicationController
    before_action :authenticate_user!

    def show
      render turbo_stream: turbo_stream.update("reload-button-frame", partial: 'ysws/reload_button')
    end

    def create
      Ysws::PullFromAirtable.perform_later
      render turbo_stream: turbo_stream.update("reload-button-frame", partial: 'ysws/reload_button')
    end

    def status
      execution = GoodJob::Execution.find_by(active_job_id: params[:job_id])
      if execution&.finished_at
        render json: {
          finished: true,
          duration: (execution.finished_at - execution.created_at).round
        }
      elsif execution&.created_at
        render json: {
          finished: false,
          running_time: (Time.current - execution.created_at).round
        }
      else
        render json: { finished: false, running_time: 0 }
      end
    end
  end
end 