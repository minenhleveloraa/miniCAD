OUR DNA \| YOUR FOOTPRINT

NETSTREAM\
INTEGRATED SOLUTIONS

# Full-Stack Developer

# Technical Assessment

*Project brief: "MiniCAD" -- a small-scale Computer-Aided Dispatch
system*\
*Web (React) + Mobile (React Native) + Supabase*

  ----------------------------------- -----------------------------------
  Issued                              Thursday, 03 September 2026

  Submission Deadline                 Saturday, 05 September 2026 ---
                                      10:00 PM

  Applies To                          All candidates being assessed for
                                      the Full-Stack Developer role

  Assessment Type                     Individual --- solo build,
                                      conceptualisation through
                                      deployment
  ----------------------------------- -----------------------------------

# 1. Purpose of This Assessment

We build on a React / React Native, Vercel, Supabase, and Git/GitHub
stack. This assessment is designed to show us, in a realistic but
bounded way, that you can take a product idea from concept through to a
working, deployed system on that exact stack.

This is not a puzzle or a algorithm test, and it isn't meant to be a
huge system --- it's deliberately scoped small, with a realistic
timeline attached to it. We want to see what you actually come up with
when given a concept and a deadline, including the planning and
documentation that goes with it, not just the code.

You are being assessed as a full-stack developer. You are expected to
design the data model, build the web application, build the mobile
application, wire up the backend, deploy all of it, push it to
Git/GitHub, and document it --- end to end, on your own.

# 2. The Brief: MiniCAD --- A Small-Scale Computer-Aided Dispatch System

You are building a scaled-down Computer-Aided Dispatch (CAD) system,
modelled on how a real emergency/incident dispatch workflow operates,
compressed into two roles and a simple status pipeline.

## 2.1 The Scenario

A caller phones in. The Dispatcher takes the call, logs the incident,
and dispatches it out to the pool of officers currently on duty and
available. Those officers get a push notification on their mobile app,
and the first one free to respond selects that incident and claims it.
The dispatcher sees, in real time, which officer picked it up. Once the
officer has responded to the call, they submit a short incident report
from the app --- and that report becomes visible to the dispatcher
against that incident.

## 2.2 Roles & Status Flow

-   Dispatcher --- takes the call, logs the incident, views
    on-duty/available officers, dispatches the incident out to that
    pool, watches the live queue, and reviews the officer's report once
    submitted. Web only.
-   Officer --- goes on/off duty, receives a push notification when an
    incident is dispatched, chooses which open incident to respond to
    (claims it), updates status while responding, and submits an
    incident report at the end. Mobile only.

Both roles can exist in one Supabase project with a role field --- you
decide the exact schema.

Important rule: "on duty" is set by the officer themselves, from inside
their logged-in mobile app session --- it is not something the
dispatcher sets or overrides. An officer who is not logged into the app,
or who is logged in but has set themselves off-duty, must not receive
the dispatch and must not be selectable/visible to the dispatcher as an
eligible unit. The dispatcher's pool of officers to dispatch to should
reflect only those genuinely logged in and on-duty at that moment, kept
live via your realtime sync.

Incident status pipeline (minimum): New → Dispatched → Claimed → En
Route → On Scene → Resolved (Report Submitted).

## 2.3 Required Functionality --- Web App (Dispatcher)

-   Login for the Dispatcher role. Seeded test accounts are fine --- a
    full sign-up flow is not required.
-   A form to log a new incident --- caller name, caller phone,
    location/address, incident type, priority, short description.
-   A way to dispatch a logged incident out to the pool of currently
    on-duty officers only (a broadcast to that pool, not a manual
    one-to-one assignment --- the officer picks it up on their end).
    Off-duty or logged-out officers must not receive it and must not
    appear as dispatchable.
-   A live queue of incidents and their current status (New → Dispatched
    → Claimed → ... → Resolved), updating in real time without a manual
    page refresh, including which officer claimed each one.
-   A view of officers and their current status (on duty/available,
    responding, or off duty/not logged in) --- this list drives who the
    dispatcher can actually dispatch to.
-   An incident detail view that, once an officer has submitted their
    report, shows that report to the dispatcher.

## 2.4 Required Functionality --- Mobile App (Officer)

-   Officer login, and an explicit control for the officer to set
    themselves on-duty/available or off-duty --- this status is what
    makes them eligible to receive dispatches.
-   A push notification to the officer's device the moment the
    dispatcher dispatches a new incident, but only if that officer is
    logged in and currently on-duty.
-   A list of open, unclaimed dispatched incidents the officer can
    choose from, and a way to select/claim the one they're responding
    to.
-   Once claimed by any officer, it should drop off (or show as taken
    on) other officers' lists in real time.
-   Incident detail screen where the officer can move their claimed
    incident through the status pipeline (En Route → On Scene).
-   A short incident report form the officer fills in and submits once
    they've responded --- e.g. summary of actions taken, outcome, time
    resolved. Submitting the report should move the incident to Resolved
    and make the report visible to the dispatcher.

## 2.5 Required Integration Components

Two separate integrations are required --- each testing a different kind
of API/data source:

-   1.  Push notifications (device API): officers must be notified on
        their device when the dispatcher dispatches a new incident ---
        an in-app banner alone is not sufficient; this needs to reach
        the device (e.g. Expo push notifications).
-   2.  Live data sync (realtime backend): the dispatcher's queue and
        the officer's list of open/claimed incidents must all update in
        real time (e.g. via Supabase Realtime subscriptions) --- not on
        a polling timer and not only on page load. In particular, once
        one officer claims an incident, it needs to disappear (or show
        as taken) for the others live.

Stretch goals (optional, not required to pass --- use these to show
range if you have time left):

-   Basic incident priority sorting/filtering on the dispatcher queue.
-   A simple history view for the dispatcher of past resolved incidents
    and their reports.

# 3. Required Tech Stack

Use our production stack --- this is part of what's being assessed, not
just the app itself:

-   Web: React (Next.js preferred), deployed on Vercel.
-   Mobile: React Native, built out to an installable Android APK using
    Expo (or another method of your choice) --- the APK itself must be
    submitted to us, not just a repo.
-   Backend: Supabase --- Postgres database, Auth, and Realtime.
    Row-level security should be considered, not ignored.
-   Source control: a Git repository (GitHub), with commit history
    showing your actual progression --- not a single "initial commit."
    The repository must include a README.md (see Section 4).

# 4. Deliverables Checklist

Everything below must be reachable from a single submission document
(see Section 6). Nothing should require us to go hunting.

  -----------------------------------------------------------------------
  \#                      Deliverable             What We Expect
  ----------------------- ----------------------- -----------------------
  1                       Live Vercel link        Working URL to the
                                                  deployed web app, plus
                                                  a test login for the
                                                  Dispatcher role.

  2                       Downloadable APK        A shareable link
                                                  (e.g. Google Drive) we
                                                  can use to download and
                                                  install the APK
                                                  ourselves, plus a test
                                                  Officer login.

  3                       GitHub repository link  Public, or shared with
                                                  the reviewer --- commit
                                                  history intact, with a
                                                  README.md in the repo
                                                  itself.

  4                       README                  Architecture overview,
                                                  database schema/ERD,
                                                  environment variables
                                                  required, local
                                                  setup/run instructions,
                                                  and known limitations
                                                  or shortcuts you took.

  5                       Architecture diagram    A simple system diagram
                                                  --- web app, mobile
                                                  app, Supabase
                                                  (DB/Auth/Realtime), and
                                                  any external API ---
                                                  and how they connect.
                                                  Hand-drawn/exported
                                                  from any tool is fine.

  6                       Database diagram (ERD)  Tables, key fields, and
                                                  relationships. Can be
                                                  embedded in the README.

  7                       Project plan            See Section 5 --- your
                                                  own planning document
                                                  for how you approached
                                                  the two and a half
                                                  days.

  8                       Demo video              A short screen
                                                  recording walking
                                                  through the working
                                                  system end-to-end,
                                                  shared via a Google
                                                  Drive link (see Section
                                                  6).
  -----------------------------------------------------------------------

# 5. Project Plan Requirement

Before you write a line of production code, produce a short project plan
--- as you would for any real client engagement --- showing how you
broke the brief down and sequenced the work. This is being evaluated in
its own right, separately from the code.

At minimum, your plan should show:

1.  Phases you worked through (discovery/design, environment & auth
    setup, data modelling, web build, mobile build, integration,
    testing, deployment, documentation).
2.  A short statement of the functional and non-functional requirements
    you're building to --- this doesn't need to be a long formal
    document, a few lines of each is enough, but it needs to be
    explicitly written down before you start building.
3.  What you planned to deliver at the end of each phase.
4.  A timeline against those phases, fitted into the window between
    receiving this brief and the Saturday 10:00 PM deadline.
5.  Any assumptions or trade-offs you made to fit the scope into the
    time available, and why..

# 6. Submission Format & Instructions

Submit ONE document --- PDF or Word (.docx) --- containing all of the
following, in this order:

1.  Cover: your name, the date, and links to the (a) live web app, (b)
    APK download, and (c) GitHub repo.
2.  Your project plan (Section 5).
3.  Your README content (architecture overview, DB schema/ERD, setup
    instructions, environment variables, known limitations) --- can be
    pasted in or exported from your repo's README.md.
4.  Test credentials for each role (Dispatcher, Officer).
5.  A short demo video walking through the working system end-to-end (a
    few minutes is enough) --- shared via a Google Drive link.
6.  (Optional) A few screenshots of the working app, web and mobile.

*File naming: FirstName_LastName_MiniCAD_Assessment.pdf (or .docx).*

For the APK, don't attach the file --- share a Google Drive link (or
similar) we can use to download and install it ourselves.

## Where & How to Submit

  ----------------------------------- -----------------------------------
  Target deadline                     Saturday, 05 September 2026 ---
                                      10:00 PM. Submit by this time to
                                      avoid any penalty.

  Hard cutoff                         Midnight, Saturday, 05 September
                                      2026. Submissions between 10:00 PM
                                      and midnight will still be accepted
                                      but will be penalized in scoring.
                                      Nothing will be accepted after
                                      midnight.

  Send to                             devops1@netstreamis.co.za (Attn:
                                      Chloe)

  Cc                                  sadha@netstreamis.co.za

  Also                                Once you've sent your submission
                                      email, send us a message on Indeed
                                      to confirm it's in --- messaging us
                                      on Indeed with questions along the
                                      way is fine too.
  ----------------------------------- -----------------------------------

# 7. Evaluation Criteria

Shared here for transparency --- this is roughly how submissions will be
reviewed:

  -----------------------------------------------------------------------
  Criteria                            What We're Looking For
  ----------------------------------- -----------------------------------
  Core flow works, end to end         Dispatcher logs and dispatches a
                                      call → an on-duty officer gets a
                                      push notification and claims it
                                      live → officer responds and submits
                                      a report → dispatcher can see that
                                      report --- all actually working,
                                      not just scaffolded.

  Data modelling                      Sensible schema, relationships, and
                                      use of Supabase (Auth, RLS,
                                      Realtime).

  Code quality & structure            Readable, reasonably organised,
                                      sensible component/file structure
                                      across both apps.

  Web & mobile parity                 Both apps are functional, not just
                                      one with the other as an
                                      afterthought.

  Integration handling                How cleanly push notifications and
                                      the realtime claim/sync flow were
                                      implemented.

  Documentation                       README, diagrams, and setup
                                      instructions are clear enough that
                                      someone else could pick up the
                                      project.

  Project planning                    Realistic phasing and timeline, and
                                      evidence you actually followed it
                                      (commit history helps here).

  Production readiness                It's actually deployed and the
                                      links actually work when we open
                                      them.
  -----------------------------------------------------------------------

# 8. A Few Notes on Scope

-   This is deliberately scoped small. We are not expecting a polished,
    feature-complete CAD platform in two and a half days --- we're
    expecting a working core loop, sensibly built, sensibly documented.
-   Keep realistic operational requirements in mind on both the frontend
    and backend --- basic validation, sensible error handling, and
    reasonable loading/empty states --- rather than only building the
    happy path.
-   If you have to cut something to hit the deadline, cut it --- but say
    so in your README under "known limitations," and tell us what you
    would have done with more time. That judgement call is itself part
    of what's being assessed.
-   Candidates are being assessed relative to their own stated
    experience level. A junior candidate is not expected to produce the
    same polish as a candidate with 3+ years' experience --- but both
    are expected to submit a working, deployed, documented core flow.
-   If you get stuck on something, document what you tried and what
    you'd investigate next --- that's more useful to us than a silent
    gap.

Questions about this brief can be sent to devops1@netstreamis.co.za
(Attn: Chloe) --- messaging us on Indeed is also fine. All the best ---
we look forward to receiving your submission.
