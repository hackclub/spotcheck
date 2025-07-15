Rails.application.config.middleware.use OmniAuth::Builder do
  provider :slack,
           Rails.application.credentials.slack.client_id,
           Rails.application.credentials.slack.client_secret,
           scope: 'identity.basic identity.email identity.avatar identity.team chat:write im:write mpim:write'
end

# Disable CSRF protection for OmniAuth callback endpoint
OmniAuth.config.allowed_request_methods = [:post, :get] 