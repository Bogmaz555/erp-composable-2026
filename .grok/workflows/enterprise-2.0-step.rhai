let meta = #{
    name: "enterprise-2.0-step",
    description: "One Enterprise 2.0 automation tick: emit STATUS handoff and execute current phase fully",
    phases: [
        #{ title: "ControlPlane", detail: "run automation step and load prompt" },
        #{ title: "Execute", detail: "agent executes NEXT_AGENT_PROMPT" },
        #{ title: "Finalize", detail: "status + push" },
    ],
};

phase("ControlPlane");
let root = if args == () { () } else { args.root };
if root == () {
    root = "/home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026";
}

let boot = agent(
    "Repo root: " + root + ". "
        + "Run: cd " + root + " && bash scripts/enterprise-2.0/autonomous-driver.sh once ; true. "
        + "Then read docs/ENTERPRISE-2.0-STATUS.md and docs/enterprise-2.0/NEXT_AGENT_PROMPT.md fully. "
        + "Return a short summary: milestone, phase, state, and first 30 lines of NEXT_AGENT_PROMPT.",
    #{ label: "e20-control", capability_mode: "all" }
);

if boot == () || !boot.success {
    complete(#{ ok: false, error: "control plane agent failed" });
}

phase("Execute");
let exec_prompt = "";
exec_prompt += "You are the Enterprise 2.0 autonomous agent. ZERO confirmation pauses. ";
exec_prompt += "Repo: " + root + ". ";
exec_prompt += "1) Read docs/ENTERPRISE-2.0-STATUS.md and docs/enterprise-2.0/NEXT_AGENT_PROMPT.md and docs/enterprise-2.0/AGENT_CONTRACT.md. ";
exec_prompt += "2) EXECUTE the entire NEXT_AGENT_PROMPT for the current milestone/phase. ";
exec_prompt += "3) DESIGN: write the design_doc with ## PR Plan. IMPLEMENT: implement the plan. GATE: run gate-check. RELEASE: gh pr + tag. ";
exec_prompt += "4) After phase work: update STATUS (or node scripts/enterprise-2.0/advance-phase.mjs success 'done'). ";
exec_prompt += "5) Commit relevant files, push branch, run: pnpm run enterprise:step. ";
exec_prompt += "6) Non-negotiables: ADR-008, no secrets, no force-push master, no filter-repo without APPROVED_BY_USER_A, DR only erp-pilot-dr. ";
exec_prompt += "7) Do not redo completed work. Report milestone/phase/state at end.";

let work = agent(
    exec_prompt,
    #{ label: "e20-execute", capability_mode: "all" }
);

phase("Finalize");
let fin = agent(
    "Repo: " + root + ". Run: bash scripts/enterprise-2.0/autonomous-driver.sh once ; true. "
        + "Read docs/ENTERPRISE-2.0-STATUS.md. Report final milestone, phase, state, last_error. "
        + "If still AGENT work needed, say RESUME_NEEDED.",
    #{ label: "e20-finalize", capability_mode: "all" }
);

let ok = work != () && work.success;
complete(#{
    ok: ok,
    control: if boot != () { boot.output } else { () },
    execute: if work != () { work.output } else { () },
    final: if fin != () { fin.output } else { () },
});
