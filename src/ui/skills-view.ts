// Skills view: the student's skills and classes, the skill guide by status, and what they're studying
import type { Kid, Shown } from "../types";
import { gsuCourseFor } from "../data/courses";
import { CATEGORY, CAT_KEY, GUIDE, LINKS, SKILLS, SKILL_BY_ID } from "../data/skills";
import { isLearning, setLearning, shown, skillSources, type HaveMap } from "../lib/skills";
import { addTag, commit, ensureOwn, state, ui } from "../lib/store";
import { backup, restore } from "./backup";
import { closeDialog } from "./dialogs";
import { STATUS_BADGE, h, icon, statusIcon, toast } from "./dom";
import { panes, render, scroller } from "./render";
import { k, t } from "../lib/i18n";

const STATUS_SECTIONS: [Shown, string][] = [["yes", k("You have")], ["learning", k("Studying")], ["partly", k("Partly, from classes")], ["no", k("Not yet")]];
/** School years, stored in English and shown in the chosen language. */
export const YEARS = [k("Freshman"), k("Sophomore"), k("Junior"), k("Senior"), k("Graduate student")];
const inputValue = (e: Event) => (e.target as HTMLInputElement).value;

/** Opens a skill in the guide, from anywhere in the app. */
export function openSkill(id: string): void {
  closeDialog();
  ui.view = "skills"; ui.pane.skills = "center"; ui.openSkills.add(id);
  render();
  const el = document.getElementById("guide-" + id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** A list of removable tags with an input that adds on Enter or comma. */
function tagBox(key: "skills" | "classes", inputId: string, placeholder: string, show?: (t: string) => boolean): HTMLElement {
  const items = state.profile[key];
  const input = h("input", { type: "text", id: inputId, placeholder, "aria-label": placeholder,
    onkeydown: (e: KeyboardEvent) => {
      const el = e.target as HTMLInputElement;
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const v = el.value; el.value = ""; addTag(key, v); }
      else if (e.key === "Backspace" && !el.value) {
        const i = items.map((t, j): [string, number] => [t, j]).filter(([t]) => !show || show(t)).map(([, j]) => j).pop();
        if (i !== undefined) { items.splice(i, 1); commit(); }
      }
    },
    onblur: (e: FocusEvent) => { const el = e.target as HTMLInputElement; if (el.value.trim()) { const v = el.value; el.value = ""; addTag(key, v); } } });
  return h("div", { class: "tags" }, ...items.map((tag, i) => (show && !show(tag)) ? null : h("span", { class: "tag" }, tag,
    h("button", { type: "button", "aria-label": t("Remove {name}", { name: tag }), onclick: () => { items.splice(i, 1); commit(); } }, icon("x", "sm")))), input);
}

export function skillsView(have: HaveMap): HTMLElement[] {
  const p = state.profile;
  const gsuTaken = p.classes.filter(c => gsuCourseFor(c)).length;
  const left: Kid[] = [scroller("mine",
    h("div", { class: "side-sec" }, h("h3", null, t("About you")),
      h("label", { class: "field" }, t("Name"), h("input", { class: "input", id: "p-name", type: "text", value: p.name, onchange: (e: Event) => { ensureOwn(); state.profile.name = inputValue(e).trim(); commit(); } })),
      h("div", { class: "form-grid" },
        h("label", { class: "field" }, t("Year"), h("select", { class: "input", id: "p-year", onchange: (e: Event) => { ensureOwn(); state.profile.year = inputValue(e); commit(); } },
          ...YEARS.map(y => h("option", { value: y, selected: y === p.year }, t(y))))),
        h("label", { class: "field" }, t("Graduation"), h("input", { class: "input", id: "p-grad", type: "text", value: p.grad, placeholder: "Dec 2027", onchange: (e: Event) => { ensureOwn(); state.profile.grad = inputValue(e).trim(); commit(); } })))),
    h("div", { class: "side-sec" }, h("h3", null, t("My skills")),
      tagBox("skills", "skillInput", t("Add a skill, then Enter")),
      h("p", { class: "note" }, t("Or open any skill in the guide and tap \u201CI have this.\u201D"))),
    h("div", { class: "side-sec" }, h("h3", null, t("Resume bullets")),
      h("p", { class: "note" }, t("Paste the bullets from your resume, one per line. Each posting then shows which ones to lead with and what to reword.")),
      (() => {
        const ta = h("textarea", { class: "input", id: "p-resume", style: "min-height:150px", placeholder: "Processed bi-weekly payroll for 6 staff\nTracked vendor invoices for 4 projects",
          onchange: (e: Event) => { ensureOwn(); state.profile.resume = inputValue(e); commit(); } });
        ta.value = p.resume;
        return ta;
      })()),
    h("div", { class: "side-sec" }, h("h3", null, t("Classes")),
      h("p", { class: "note" }, gsuTaken === 1 ? t("1 GSU class marked as taken.") : t("{n} GSU classes marked as taken.", { n: gsuTaken }), " ",
        h("button", { type: "button", style: "text-decoration:underline;text-underline-offset:2px", onclick: () => { ui.view = "plan"; ui.libFilter = "all"; ui.pane.plan = "left"; render(); } }, t("Mark them in Plan"))),
      h("span", { class: "field" }, h("span", null, t("Other classes") + " ", h("span", { class: "muted" }, "· " + t("transfer or not listed")))),
      tagBox("classes", "classInput", t("Add a class, then Enter"), c => !gsuCourseFor(c))),
    h("div", { class: "side-sec" }, h("h3", null, t("Your data")),
      h("p", { class: "note" }, t("Everything saves in this browser only. Back up now and then, and restore the file to move to another device.")),
      h("div", { class: "acts" },
        h("button", { type: "button", class: "btn sm", onclick: backup }, t("Back up")),
        h("button", { type: "button", class: "btn sm", onclick: restore }, t("Restore")))))];

  const center: Kid[] = [scroller("guide", h("div", { class: "guide" },
    h("div", { style: "display:grid;gap:4px" }, h("span", { class: "kicker" }, t("Skill guide")),
      h("p", { class: "muted", style: "font-size:13px;max-width:70ch" }, t("What each skill means, how to check yourself, and free places to learn it. Keep only the skills you could talk about in an interview."))),
    ...STATUS_SECTIONS.map(([key, label]) => {
      const ids = SKILLS.map(x => x.id).filter(id => shown(id, have[id] || "no") === key);
      return ids.length ? h("section", { class: "year" },
        h("div", { class: "status-head st-" + key }, statusIcon(key), h("span", null, t(label)), h("span", { class: "cnt" }, ids.length)),
        h("div", null, ...ids.map(id => skillCard(id, have)))) : null;
    })))];

  const studying = p.learning.filter(id => (have[id] || "no") !== "yes");
  const right: Kid[] = [scroller("studying",
    h("div", { class: "verdict" },
      h("div", { class: "kicker" }, t("Studying now")),
      h("div", { class: "headline" }, !studying.length ? t("Nothing yet") : studying.length === 1 ? t("1 skill") : t("{n} skills", { n: studying.length })),
      h("div", { class: "detail" }, studying.length ? t("Tap one to see where to learn it.") : t("Open a skill and tap “I'm learning this.”"))),
    studying.length ? h("div", { class: "checks" }, ...studying.map(id => h("button", { type: "button", class: "skill-line", onclick: () => openSkill(id) },
      statusIcon("learning"), h("span", { class: "nm" }, SKILL_BY_ID[id].name)))) : null)];
  return panes({ left, center, right });
}

function skillCard(id: string, have: HaveMap): HTMLElement {
  const s = SKILL_BY_ID[id], info = GUIDE[id], base = have[id] || "no", v = shown(id, base);
  const src = skillSources(state.profile, s);
  const card = h("details", { class: "skill-card is-" + v, id: "guide-" + id, open: ui.openSkills.has(id) },
    h("summary", null, statusIcon(v), h("span", { class: "nm" }, s.name),
      h("span", { class: "cat cat-" + CAT_KEY[id] }, CATEGORY[id]),
      h("span", { class: "badge " + STATUS_BADGE[v][0] }, t(STATUS_BADGE[v][1]))),
    h("div", { class: "skill-body" },
      h("div", null, h("h4", null, t("What it is")), h("p", null, info.what)),
      h("div", null, h("h4", null, t("You have it if")), h("p", null, info.check)),
      h("div", null, h("h4", null, t("How to learn it")), h("ul", null, ...info.learn.map(x => h("li", null, x)))),
      LINKS[id] ? h("div", null, h("h4", null, t("Free places to start")),
        h("div", { class: "links" }, ...LINKS[id].map(([label, url]) => h("a", { href: url, target: "_blank", rel: "noopener" }, label, icon("external", "sm"))))) : null,
      (src.tags.length || src.classes.length) ? h("p", { class: "note" },
        t("Counted because of {list}.", { list: [...src.tags.map(tag => "“" + tag + "”"), ...src.classes].join(", ") })) : null,
      h("div", { class: "acts" },
        src.tags.length
          ? h("button", { class: "btn sm", type: "button", onclick: () => {
              state.profile.skills = state.profile.skills.filter(tag => !src.tags.includes(tag)); commit();
              toast(t("Removed {skill} from your skills.", { skill: s.name }));
            } }, t("I don't have this yet"))
          : h("button", { class: "btn sm primary", type: "button", onclick: () => { setLearning(id, false); addTag("skills", s.name); toast(t("Added {skill} to your skills.", { skill: s.name })); } }, icon("check"), t("I have this")),
        base !== "yes" ? h("button", { class: "btn sm", type: "button", "aria-pressed": String(isLearning(id)), onclick: () => {
            const on = !isLearning(id); setLearning(id, on); commit();
            toast(on ? t("Added {skill} to Studying now.", { skill: s.name }) : t("Took {skill} off Studying now.", { skill: s.name }));
          } }, icon("half"), isLearning(id) ? t("Stop studying") : t("I'm learning this")) : null,
        src.classes.length && src.tags.length ? h("span", { class: "note" }, t("Your classes still count toward it.")) : null)));
  card.addEventListener("toggle", () => { if (card.open) ui.openSkills.add(id); else ui.openSkills.delete(id); });
  return card;
}
