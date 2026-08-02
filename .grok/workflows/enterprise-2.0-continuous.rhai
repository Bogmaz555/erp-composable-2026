let meta = #{
    name: "enterprise-2.0-continuous",
    description: "Multi-tick Enterprise 2.0 automation: repeatedly execute current phase until budget or DONE",
    phases: [
        #{ title: "Tick1", detail: "first full phase execution" },
        #{ title: "Tick2", detail: "second full phase execution" },
        #{ title: "Tick3", detail: "third full phase execution" },
        #{ title: "Report", detail: "final STATUS" },
    ],
};

let root = if args == () { () } else { args.root };
if root == () {
    root = "/home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026";
}

fn tick_prompt(root, n) {
    let p = "";
    p += "Enterprise 2.0 continuous tick #" + n + ". ZERO pauses. Repo: " + root + ". ";
    p += "Read STATUS + NEXT_AGENT_PROMPT + AGENT_CONTRACT. Execute the prompt fully. ";
    p += "DESIGN writes design with PR Plan; IMPLEMENT implements; GATE runs gate-check.sh; RELEASE opens/merges PR and tags. ";
    p += "Advance STATUS honestly. Commit + push. Run pnpm run enterprise:step. ";
    p += "If DONE or BLOCKED, stop and report. Non-negotiables ADR-008.";
    p
}

phase("Tick1");
let t1 = agent(tick_prompt(root, "1"), #{ label: "e20-t1", capability_mode: "all" });

phase("Tick2");
let t2 = agent(tick_prompt(root, "2"), #{ label: "e20-t2", capability_mode: "all" });

phase("Tick3");
let t3 = agent(tick_prompt(root, "3"), #{ label: "e20-t3", capability_mode: "all" });

phase("Report");
let rep = agent(
    "Repo: " + root + ". Read docs/ENTERPRISE-2.0-STATUS.md only. "
        + "Return milestone, phase, state, checklist lines, last_error, next_action. "
        + "If not DONE, include the RESUME one-liner from AGENT_CONTRACT.",
    #{ label: "e20-report", capability_mode: "read-only" }
);

complete(#{
    ok: true,
    tick1: if t1 != () { t1.success } else { false },
    tick2: if t2 != () { t2.success } else { false },
    tick3: if t3 != () { t3.success } else { false },
    report: if rep != () { rep.output } else { () },
});
