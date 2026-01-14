import Airtable from "airtable"

const AIRTABLE_BASE_ID = "apptaWdakfHcHzIuv"

export const getAirtableBase = () => {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) {
    throw new Error("AIRTABLE_API_KEY is not set")
  }

  return new Airtable({ apiKey }).base(AIRTABLE_BASE_ID)
}
