Rails.application.routes.draw do
  namespace :ysws do
    get "spot_check_sessions/new"
    get "spot_check_sessions/create"
    get "spot_check_sessions/show"
    get "spot_checks/new"
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Authentication routes
  get "/auth/slack/callback", to: "sessions#create"
  get "/login", to: "sessions#new"
  delete "/logout", to: "sessions#destroy"
  
  # Protected routes using custom constraint
  constraints lambda { |request|
    user_slack_id = request.session[:user_slack_id]
    user_slack_id.present? && AuthorizedUser.exists?(slack_user_id: user_slack_id)
  } do
    get '/home', to: 'home#index', as: :authenticated_root
    
    # Mount GoodJob dashboard
    mount GoodJob::Engine => "/good_job"
    
    # YSWS routes
    namespace :ysws do
      post '/reload', to: 'reloads#create'
      get '/reload_status', to: 'reloads#status'
      resource :reload, only: [:show, :create]
      
      get 'projects/spot_checks/new_random', to: 'spot_checks#new_random', as: :new_random_review
      resources :spot_check_sessions, only: [:new, :create, :show]
      resources :approved_projects, only: [] do
        resources :spot_checks, only: [:new, :create]
      end
    end
  end

  # Root route for unauthenticated users
  root "sessions#new"
end
