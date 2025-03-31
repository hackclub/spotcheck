# Add session middleware for the engine
GoodJob::Engine.middleware.use(ActionDispatch::Cookies)
GoodJob::Engine.middleware.use(ActionDispatch::Session::CookieStore)

Rails.application.configure do
  config.good_job = config.good_job.merge({
    enable_cron: true,
    cron: {
      import_approved_projects: {
        cron: "15 * * * *", # Every hour at :15
        class: "Ysws::PullFromAirtable",
        description: "Import approved projects from Airtable hourly"
      }
    },
    dashboard_default_locale: :en
  })
end