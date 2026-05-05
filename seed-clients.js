import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ximyxslvdcbqexiopgpm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kLYPu63cO2j-4ocFZEFuLg_jE3Ge2Pe";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REQUESTED_CLIENTS = [
  {
    id: "client-upstate-servicing-group-issac-malik",
    company: "Upstate servicing group",
    contact: "Issac Malik",
    phone: "(845) 422-2107",
    email: "imalik@usgny.com",
    status: "Prospective",
    meeting_date: null,
    meeting_owner: "",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Imported from screenshot. Screenshot shows 8 buildings.",
    updated_at: new Date().toISOString(),
  },
  {
    id: "client-garden-springs-mark-friedman",
    company: "Garden Springs",
    contact: "Mark Friedman",
    phone: "+1 (917) 974-6115",
    email: "mark@eastbrookhealth.com",
    status: "Prospective",
    meeting_date: null,
    meeting_owner: "Jack",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Added from user-provided client details.",
    updated_at: new Date().toISOString(),
  },
];

async function seedRequestedClients() {
  try {
    const { error } = await supabase.from("clients").upsert(REQUESTED_CLIENTS, { onConflict: "id" });
    if (error) throw error;
    window.dispatchEvent(new CustomEvent("sns-clients-seeded"));
  } catch (error) {
    console.warn("Requested client auto-seed failed", error);
  }
}

seedRequestedClients();
