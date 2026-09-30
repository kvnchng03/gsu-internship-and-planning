// Dialogs: a class's details, a posting's details, and the add/edit posting form
import type { Have, Kid, Posting } from "../types";
import { COURSE_BY_CODE, REQ_GROUPS, UNLOCKS, WHY } from "../data/courses";
import { SKILL_BY_ID } from "../data/skills";
import { STATUS_LABEL } from "../data/statuses";
import { issuesFor, listOf, place, planContext, planTerms, setTaken, shortTerm, termName, unplace } from "../lib/plan";
import { MAX_TEXT, findDuplicate } from "../lib/postings";
import { haveMap } from "../lib/skills";
import { commit, ensureOwn, state, ui } from "../lib/store";
import { byId, h, icon, statusIcon, toast } from "./dom";
import { postingCard } from "./postings-view";
import { openSkill } from "./skills-view";

export const dlg = (): HTMLDialogElement => byId<HTMLDialogElement>("dlg");
function show(): void { if (!dlg().open) dlg().showModal(); }

export function openCourse(code: string): void {
  dlg().classList.remove("palette", "wide");
  ui.dialog = { kind: "course", code, live: true };
  renderDialog();
  show();
}
export function closeDialog(): void { if (dlg().open) dlg().close(); ui.dialog = null; dlg().classList.remove("wide"); }
export function openPosting(id: string): void {
  dlg().classList.remove("palette");
  dlg().classList.add("wide");
  ui.dialog = { kind: "posting-view", id, live: true };
  renderDialog();
  show();
}
/** Redraws a dialog that shows live data, after the data changes. */
export function renderDialog(): void {
  const d = ui.dialog;
  if (!d) return;
  if (d.kind === "course") dlg().replaceChildren(...courseDialog(d.code).filter((x): x is HTMLElement => !!x));
  if (d.kind === "posting-view") {
    const p = state.postings.find(x => x.id === d.id);
    if (!p) { closeDialog(); return; }
    dlg().replaceChildren(postingCard(p, haveMap(state.profile)));
  }
}
export function dialogHead(kicker: Kid, title: string, sub?: Kid): HTMLDivElement {
  return h("div", { class: "dlg-head" },
    h("div", { class: "t" }, kicker, h("h2", null, title), sub || null),
    h("button", { type: "button", class: "icon-btn", "aria-label": "Close", onclick: closeDialog }, icon("x")));
}

function courseDialog(code: string): (HTMLElement | null)[] {
  const c = COURSE_BY_CODE[code], ctx = planContext(), terms = planTerms();
  const taken = ctx.taken.has(code), pos = ctx.where[code];
  const iss = pos !== undefined ? issuesFor(c, pos, ctx) : { hard: [], soft: [] };
  const group = REQ_GROUPS.find(g => g.id === c.req)?.name || "";
  const preItem = (alts: string[]) => {
    const done = alts.find(x => ctx.taken.has(x)), planned = alts.find(x => ctx.where[x] !== undefined);
    const mark = done ? "yes" : planned ? "learning" : "no";
    const label = done ? "done" : planned ? shortTerm(terms[ctx.where[planned]].id) : "not planned";
    return h("div", { class: "req-item" }, statusIcon(mark),
      h("span", { style: "flex:1" }, ...alts.flatMap((x, i) => [i ? " or " : null,
        COURSE_BY_CODE[x]
          ? h("button", { type: "button", class: "mono", style: "text-decoration:underline;text-underline-offset:2px", onclick: () => openCourse(x) }, x)
          : h("span", { class: "mono" }, x)])),
      h("span", { class: "mono muted", style: "font-size:11px" }, label));
  };
  const pres = [...(c.pre || []).map(p => preItem([p])), ...(c.any || []).map(a => preItem(a))];
  const skills: [string, Have][] = [
    ...(c.yes || []).map((id): [string, Have] => [id, "yes"]),
    ...(c.partly || []).map((id): [string, Have] => [id, "partly"]),
  ].filter(([id]) => SKILL_BY_ID[id]);
  return [
    dialogHead(
      h("div", { class: "chips" }, h("span", { class: "badge mono" }, c.code), h("span", { class: "badge mono" }, c.hrs + " hrs"),
        h("span", { class: "badge grp grp-" + c.req }, group),
        !taken && UNLOCKS[code] >= 2 ? h("span", { class: "badge primary" }, "unlocks " + UNLOCKS[code]) : null),
      c.title,
      WHY[code] || c.note ? h("p", { class: "muted", style: "font-size:13px" }, [WHY[code], c.note].filter(Boolean).join(" ")) : null),
    iss.hard.length ? h("div", { class: "dlg-sec" }, ...iss.hard.map(x => h("p", { class: "alert" }, x + "."))) : null,
    h("div", { class: "dlg-sec" }, h("div", { class: "kicker" }, "Prerequisites"),
      pres.length ? h("div", { class: "req-list" }, ...pres) : h("p", { class: "muted" }, "None beyond the college's upper-division rules.")),
    c.co && c.co.length ? h("div", { class: "dlg-sec" }, h("div", { class: "kicker" }, "Taken with"), h("p", null, listOf(c.co))) : null,
    skills.length ? h("div", { class: "dlg-sec" }, h("div", { class: "kicker" }, "Builds skills"),
      h("div", { class: "chips" }, ...skills.map(([id, v]) =>
        h("button", { type: "button", class: "chip", onclick: () => openSkill(id) }, statusIcon(v), SKILL_BY_ID[id].name)))) : null,
    h("div", { class: "dlg-foot" },
      !taken && terms.length ? h("select", {
        class: "input", id: "dlg-plan", style: "width:auto;height:32px", "aria-label": "Plan " + code,
        onchange: (e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          if (v) place(code, v); else unplace(code);
          commit();
        },
      },
        h("option", { value: "" }, pos !== undefined ? "Not planned" : "Plan for…"),
        ...terms.map(t => h("option", { value: t.id, selected: pos !== undefined && terms[pos].id === t.id }, termName(t.id)))) : null,
      h("span", { class: "spacer" }),
      taken
        ? h("button", { type: "button", class: "btn", onclick: () => setTaken(code, false) }, icon("check"), "Taken · undo")
        : h("button", { type: "button", class: "btn primary", onclick: () => { setTaken(code, true); toast(code + " marked as taken."); } }, "I've taken this")),
  ];
}

export function openPostingForm(p: Posting | null): void {
  dlg().classList.remove("palette", "wide");
  ui.dialog = { kind: "posting", id: p ? p.id : null, live: false };
  const field = (label: string, input: HTMLElement, hint?: string) =>
    h("label", { class: "field" }, h("span", null, label, hint ? h("span", { class: "muted" }, " · " + hint) : null), input);
  const text = h("textarea", { class: "input", id: "f-text", placeholder: "Paste the job description…" });
  text.value = p ? p.text : "";
  const company = h("input", { class: "input", id: "f-company", type: "text", required: true, value: p ? p.company : "", placeholder: "Smith & Lee CPAs" });
  const form = h("form", { onsubmit: savePosting },
    dialogHead(null, p ? "Edit posting" : "Add a posting",
      h("p", { class: "muted", style: "font-size:13px" }, "Paste the whole job description. That's what the skill check reads.")),
    h("div", { class: "dlg-sec" },
      h("div", { class: "form-grid" },
        field("Company", company),
        field("Role", h("input", { class: "input", id: "f-role", type: "text", value: p ? p.role : "", placeholder: "Audit Intern, Summer 2027" })),
        field("Link", h("input", {
          // Plain text, not type=url, so a link pasted without https:// isn't rejected; saving adds it
          class: "input", id: "f-link", type: "text", inputmode: "url", autocomplete: "off", value: p ? p.link : "", placeholder: "https://",
          oninput: (e: Event) => showDuplicate(findDuplicate((e.target as HTMLInputElement).value, p && p.id)),
        }), "optional"),
        field("Deadline", h("input", { class: "input", id: "f-deadline", type: "date", value: p ? p.deadline : "" }), "optional")),
      h("div", { class: "alert", id: "f-dup", hidden: true, style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }),
      field("Posting text", text)),
    h("div", { class: "dlg-foot" },
      h("button", { type: "button", class: "btn ghost", onclick: closeDialog }, "Cancel"),
      h("button", { type: "submit", class: "btn primary" }, p ? "Save changes" : "Add posting")));
  dlg().replaceChildren(form);
  show();
  company.focus();
}

/** Warns that a link is already saved, with a way to jump to the saved posting. */
function showDuplicate(dup: Posting | null): void {
  const box = document.getElementById("f-dup");
  if (!box) return;
  box.hidden = !dup;
  if (!dup) return;
  box.replaceChildren(h("span", { style: "flex:1" }, "You already saved this posting: ", h("b", null, dup.company || "Untitled posting"),
    " (" + STATUS_LABEL[dup.status] + "). The same link can't be added twice."),
    h("button", { type: "button", class: "btn sm", onclick: () => { closeDialog(); openPosting(dup.id); } }, "Open the saved one"));
}

function savePosting(e: SubmitEvent): void {
  e.preventDefault();
  const val = (id: string) => byId<HTMLInputElement | HTMLTextAreaElement>(id).value;
  const company = val("f-company").trim();
  if (!company) { byId("f-company").focus(); return; }
  let text = val("f-text");
  if (text.length > MAX_TEXT) { text = text.slice(0, MAX_TEXT); toast("The posting was long, so only the first " + MAX_TEXT.toLocaleString() + " characters were kept."); }
  const rawLink = val("f-link").trim();
  const link = rawLink && !/^[a-z][a-z0-9+.-]*:/i.test(rawLink) ? "https://" + rawLink : rawLink;
  const fields = { company, role: val("f-role").trim(), link, deadline: val("f-deadline"), text };
  const editingId = ui.dialog && ui.dialog.kind === "posting" ? ui.dialog.id : null;
  const dup = findDuplicate(fields.link, editingId);
  if (dup) { showDuplicate(dup); byId("f-link").focus(); return; }
  if (editingId) {
    const p = state.postings.find(x => x.id === editingId);
    if (p) Object.assign(p, fields);
  } else {
    ensureOwn();
    const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    state.postings.push({ id, status: "Saved", createdAt: Date.now(), priority: false, ...fields });
  }
  closeDialog();
  ui.view = "postings"; ui.postTab = "board";
  commit();
  toast(editingId ? "Posting updated." : "Posting added.");
}
