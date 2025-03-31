# Add session middleware for the engine
GoodJob::Engine.middleware.use(ActionDispatch::Cookies)
GoodJob::Engine.middleware.use(ActionDispatch::Session::CookieStore)

GoodJob.configure do |config|
  config.cron = {
    import_approved_projects: {
      cron: "15 * * * *", # Every hour at :15
      class: "Ysws::PullFromAirtable"
    }
  }
end