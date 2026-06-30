import { Briefcase, GraduationCap, Sparkles } from 'lucide-react';

const SKILL_COLORS = [
  'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

/**
 * Displays the AI-parsed resume: skill badges, an experience timeline
 * (3 most recent), and an education list.
 */
const ResumeCard = ({ resume, summary }) => {
  if (!resume) return null;

  const skills = resume.skills || [];
  const experience = (resume.experience || []).slice(0, 3);
  const education = resume.education || [];

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-surface-light dark:bg-slate-800/60 p-6 shadow-sm transition-shadow duration-150 hover:shadow-md space-y-8">
      <header className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Parsed Resume
        </h3>
      </header>

      {summary && (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {summary}
        </p>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  SKILL_COLORS[i % SKILL_COLORS.length]
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience timeline */}
      {experience.length > 0 && (
        <section>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Briefcase className="h-4 w-4" /> Experience
          </h4>
          <ol className="relative border-l border-slate-200/60 dark:border-slate-700/60 ml-2">
            {experience.map((exp, i) => (
              <li key={i} className="mb-6 ml-6 last:mb-0">
                <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-brand-500" />
                <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                  {exp.title}
                  {exp.company ? (
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      {' '}
                      @ {exp.company}
                    </span>
                  ) : null}
                </h5>
                {exp.duration && (
                  <time className="text-xs text-slate-400">{exp.duration}</time>
                )}
                {exp.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <GraduationCap className="h-4 w-4" /> Education
          </h4>
          <ul className="space-y-2">
            {education.map((edu, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">{edu.degree}</span>
                {edu.institution ? `, ${edu.institution}` : ''}
                {edu.year ? (
                  <span className="text-slate-400"> ({edu.year})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default ResumeCard;
