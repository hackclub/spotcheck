Rails.application.config.middleware.use OmniAuth::Builder do
  provider :slack,
           Rails.application.credentials.slack.client_id,
           Rails.application.credentials.slack.client_secret
end

# Disable CSRF protection for OmniAuth callback endpoint
OmniAuth.config.allowed_request_methods = [:post, :get] 