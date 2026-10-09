"use client";

import { Clapperboard, Clock, Gift, History, ImageIcon, Library, Settings, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useFocusFromHash } from "./editing";
import { Card, CardBody, CardHeader, ICON, PageHeader } from "./ui";

const PARTS = [
  {
    href: "/admin/stories",
    icon: Clapperboard,
    title: "Stories",
    body: "Each story is a YouTube video with a title, a picture, a “Do it at home” activity for the family, and the skills it teaches. It can have one picture question during the video.",
  },
  {
    href: "/admin/challenges",
    icon: Gift,
    title: "Challenges",
    body: "Five picture questions after every 4 stories. Children who finish one win its sticker.",
  },
  {
    href: "/admin/collections",
    icon: Library,
    title: "Collections",
    body: "Groups of stories, shown on Home in order. “Coming soon” collections show their poster but can't be opened yet.",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    title: "Settings",
    body: "The featured stories in the big slider on Home, and the WhatsApp number parents can write to.",
  },
  {
    href: "/admin/history",
    icon: History,
    title: "History",
    body: "Every save. “Undo this” puts things back to how they were before that save.",
  },
];

export function HelpScreen() {
  useFocusFromHash();
  return (
    <>
      <PageHeader title="Help" description="How the dashboard works, and what to do when something doesn't go as planned." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="What each part does" />
          <CardBody>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PARTS.map(({ href, icon: Icon, title, body }) => (
                <li key={href} className="flex gap-3 rounded-xl border border-line p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-listen-ink" {...ICON} />
                  <div>
                    <Link href={href} className="font-bold text-ink hover:underline">
                      {title}
                    </Link>
                    <p className="mt-0.5 text-[15px] text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <HelpCard id="going-live" icon={<Clock className="size-5" {...ICON} />} title="How long changes take">
          <p>
            Your changes stay on this screen until you press <b>Save</b>. After saving, children see them in{" "}
            <b>about 2 minutes</b>. The chip at the top says <b>Going live…</b> while that happens, then <b>Live ✓</b>.
          </p>
          <p>
            Children see the new stories the next time they open the app with internet. If the chip still says “Taking
            longer than usual” after 10 minutes, check History: your save is there and safe. Ask the person who set up the
            app to look at the hosting (Vercel).
          </p>
        </HelpCard>

        <HelpCard id="stories" icon={<Clapperboard className="size-5" {...ICON} />} title="Adding a good story">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              On YouTube, open the video, press <b>Share</b>, then <b>Copy</b>.
            </li>
            <li>
              In <b>Stories</b>, press <b>Add a story</b> and paste the link. The title, picture and length fill in by
              themselves.
            </li>
            <li>Check the title, add the Kinyarwanda title and a short “Do it at home” activity.</li>
            <li>
              Press <b>Add story</b>, then <b>Save</b>.
            </li>
          </ol>
          <p>
            The video&apos;s owner must allow it to play on other sites. If not, the dashboard says so: choose another video.
          </p>
        </HelpCard>

        <HelpCard id="refused" icon={<TriangleAlert className="size-5" {...ICON} />} title="If a save is refused">
          <p>
            Before saving, the dashboard checks everything, so a mistake can never break the app for children. If something
            is missing, nothing is saved and a list shows what to fix. Press <b>Fix</b> next to each problem to go straight
            to it, then press <b>Save</b> again.
          </p>
          <p>Common reasons: a missing English title, a picture that isn&apos;t added yet, or a question without its right answer.</p>
        </HelpCard>

        <HelpCard id="someone-else" icon={<Users className="size-5" {...ICON} />} title="If someone else saved changes">
          <p>
            If two people edit at the same time, the second save is stopped so nobody&apos;s work is overwritten without
            warning. Press <b>Reload</b> to see the latest stories, then make your change again.
          </p>
        </HelpCard>

        <HelpCard id="pictures" icon={<ImageIcon className="size-5" {...ICON} />} title="Pictures">
          <p>
            Any photo or drawing works. The dashboard makes it smaller before saving, so it loads quickly on cheap phones:
            story pictures become a wide 16:9 shape, posters 4:3, and answers and stickers keep their shape.
          </p>
          <p>Pictures with a see-through background (PNG) stay see-through, which looks best for answers and stickers.</p>
        </HelpCard>

        <HelpCard id="undo" icon={<History className="size-5" {...ICON} />} title="Undo">
          <p>
            In <b>History</b>, press <b>Undo this</b> next to a save. The stories and settings go back to how they were
            just before it. Saves made after it are undone too, and the dashboard tells you which ones before you confirm.
            Undo is saved like any other change, so you can undo an undo.
          </p>
        </HelpCard>

        <HelpCard id="safety" icon={<ShieldCheck className="size-5" {...ICON} />} title="Keeping the dashboard safe">
          <p>
            Only people with the password can open the dashboard. Sign out on shared computers. If the password may have
            leaked, ask the person who set up the app to change it: everyone is signed out at once.
          </p>
        </HelpCard>
      </div>
    </>
  );
}

function HelpCard({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
      <CardHeader icon={icon} title={title} />
      <CardBody className="space-y-3 text-[15px] leading-relaxed text-ink-2 [&_b]:font-bold [&_b]:text-ink">{children}</CardBody>
    </Card>
  );
}
