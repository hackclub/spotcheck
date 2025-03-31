# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_03_31_184657) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "authorized_users", force: :cascade do |t|
    t.string "slack_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slack_user_id"], name: "index_authorized_users_on_slack_user_id"
  end

  create_table "good_job_batches", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.jsonb "serialized_properties"
    t.text "on_finish"
    t.text "on_success"
    t.text "on_discard"
    t.text "callback_queue_name"
    t.integer "callback_priority"
    t.datetime "enqueued_at"
    t.datetime "discarded_at"
    t.datetime "finished_at"
    t.datetime "jobs_finished_at"
  end

  create_table "good_job_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "active_job_id", null: false
    t.text "job_class"
    t.text "queue_name"
    t.jsonb "serialized_params"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.text "error"
    t.integer "error_event", limit: 2
    t.text "error_backtrace", array: true
    t.uuid "process_id"
    t.interval "duration"
    t.index ["active_job_id", "created_at"], name: "index_good_job_executions_on_active_job_id_and_created_at"
    t.index ["process_id", "created_at"], name: "index_good_job_executions_on_process_id_and_created_at"
  end

  create_table "good_job_processes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "state"
    t.integer "lock_type", limit: 2
  end

  create_table "good_job_settings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "key"
    t.jsonb "value"
    t.index ["key"], name: "index_good_job_settings_on_key", unique: true
  end

  create_table "good_jobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "queue_name"
    t.integer "priority"
    t.jsonb "serialized_params"
    t.datetime "scheduled_at"
    t.datetime "performed_at"
    t.datetime "finished_at"
    t.text "error"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "active_job_id"
    t.text "concurrency_key"
    t.text "cron_key"
    t.uuid "retried_good_job_id"
    t.datetime "cron_at"
    t.uuid "batch_id"
    t.uuid "batch_callback_id"
    t.boolean "is_discrete"
    t.integer "executions_count"
    t.text "job_class"
    t.integer "error_event", limit: 2
    t.text "labels", array: true
    t.uuid "locked_by_id"
    t.datetime "locked_at"
    t.index ["active_job_id", "created_at"], name: "index_good_jobs_on_active_job_id_and_created_at"
    t.index ["batch_callback_id"], name: "index_good_jobs_on_batch_callback_id", where: "(batch_callback_id IS NOT NULL)"
    t.index ["batch_id"], name: "index_good_jobs_on_batch_id", where: "(batch_id IS NOT NULL)"
    t.index ["concurrency_key", "created_at"], name: "index_good_jobs_on_concurrency_key_and_created_at"
    t.index ["concurrency_key"], name: "index_good_jobs_on_concurrency_key_when_unfinished", where: "(finished_at IS NULL)"
    t.index ["cron_key", "created_at"], name: "index_good_jobs_on_cron_key_and_created_at_cond", where: "(cron_key IS NOT NULL)"
    t.index ["cron_key", "cron_at"], name: "index_good_jobs_on_cron_key_and_cron_at_cond", unique: true, where: "(cron_key IS NOT NULL)"
    t.index ["finished_at"], name: "index_good_jobs_jobs_on_finished_at", where: "((retried_good_job_id IS NULL) AND (finished_at IS NOT NULL))"
    t.index ["labels"], name: "index_good_jobs_on_labels", where: "(labels IS NOT NULL)", using: :gin
    t.index ["locked_by_id"], name: "index_good_jobs_on_locked_by_id", where: "(locked_by_id IS NOT NULL)"
    t.index ["priority", "created_at"], name: "index_good_job_jobs_for_candidate_lookup", where: "(finished_at IS NULL)"
    t.index ["priority", "created_at"], name: "index_good_jobs_jobs_on_priority_created_at_when_unfinished", order: { priority: "DESC NULLS LAST" }, where: "(finished_at IS NULL)"
    t.index ["priority", "scheduled_at"], name: "index_good_jobs_on_priority_scheduled_at_unfinished_unlocked", where: "((finished_at IS NULL) AND (locked_by_id IS NULL))"
    t.index ["queue_name", "scheduled_at"], name: "index_good_jobs_on_queue_name_and_scheduled_at", where: "(finished_at IS NULL)"
    t.index ["scheduled_at"], name: "index_good_jobs_on_scheduled_at", where: "(finished_at IS NULL)"
  end

  create_table "ysws_approved_projects", primary_key: "airtable_id", id: :string, force: :cascade do |t|
    t.string "email"
    t.string "referral_reason"
    t.text "heard_about"
    t.text "doing_well_feedback"
    t.text "improvement_feedback"
    t.string "age_when_approved"
    t.string "playable_url"
    t.string "code_url"
    t.text "description"
    t.string "github_username"
    t.string "address_line1"
    t.string "address_line2"
    t.string "city"
    t.string "state_province"
    t.string "country"
    t.string "postal_code"
    t.date "birthday"
    t.decimal "hours_spent", precision: 5, scale: 1
    t.decimal "override_hours_spent", precision: 5, scale: 1
    t.text "override_hours_spent_justification"
    t.decimal "weighted_project_contribution", precision: 5, scale: 1
    t.datetime "approved_at"
    t.string "first_name"
    t.string "last_name"
    t.decimal "weighted_project_contribution_per_author", precision: 5, scale: 1
    t.string "author_countries"
    t.string "unique_countries"
    t.string "archive_live_url"
    t.string "archive_code_url"
    t.datetime "archive_archived_at"
    t.boolean "archive_trigger_rearchive"
    t.boolean "archive_trigger_rearchive2"
    t.string "hack_clubber_geocoded_country"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "ysws_program_id"
    t.index ["approved_at"], name: "index_ysws_approved_projects_on_approved_at"
    t.index ["email"], name: "index_ysws_approved_projects_on_email"
    t.index ["first_name", "last_name"], name: "index_ysws_approved_projects_on_first_name_and_last_name"
    t.index ["github_username"], name: "index_ysws_approved_projects_on_github_username"
    t.index ["ysws_program_id"], name: "index_ysws_approved_projects_on_ysws_program_id"
  end

  create_table "ysws_programs", primary_key: "airtable_id", id: :string, force: :cascade do |t|
    t.string "name"
    t.decimal "average_hours_per_grant", precision: 10, scale: 1
    t.decimal "nps_score", precision: 5, scale: 2
    t.integer "nps_median_estimated_hours"
    t.string "icon_cdn_link"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "ysws_spot_check_sessions", force: :cascade do |t|
    t.jsonb "filters"
    t.integer "sampling_strategy"
    t.string "creator_slack_id"
    t.string "creator_name"
    t.string "creator_email"
    t.string "creator_avatar_url"
    t.datetime "start_time"
    t.datetime "end_time"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "ysws_spot_checks", primary_key: "airtable_id", id: :string, force: :cascade do |t|
    t.string "approved_project_id"
    t.string "assessment"
    t.text "notes"
    t.string "reviewer_slack_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "start_time"
    t.datetime "end_time"
    t.bigint "spot_check_session_id"
    t.string "reviewer_name", default: ""
    t.string "reviewer_email", default: ""
    t.string "reviewer_avatar_url", default: ""
    t.index ["approved_project_id"], name: "index_ysws_spot_checks_on_approved_project_id"
    t.index ["assessment"], name: "index_ysws_spot_checks_on_assessment"
    t.index ["spot_check_session_id"], name: "index_ysws_spot_checks_on_spot_check_session_id"
  end

  add_foreign_key "ysws_approved_projects", "ysws_programs", primary_key: "airtable_id"
  add_foreign_key "ysws_spot_checks", "ysws_approved_projects", column: "approved_project_id", primary_key: "airtable_id"
  add_foreign_key "ysws_spot_checks", "ysws_spot_check_sessions", column: "spot_check_session_id"
end
