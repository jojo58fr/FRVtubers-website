'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faUsers } from '@fortawesome/free-solid-svg-icons'
import styles from './TeamSection.module.scss'

type TeamLink = {
  icon: IconDefinition
  label: string
  href: string
}

type TeamMember = {
  name: string
  role: string
  focus: string
  links: TeamLink[]
}

type TeamSectionProps = {
  members: TeamMember[]
}

const TeamSection = ({ members }: TeamSectionProps) => {
  return (
    <section id="team" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Une equipe benevole engagee</h2>
        <p className={styles.subtitle}>
          Moderateurs, programmateurs et coachs techniques accompagnent la communaute au quotidien pour proposer une experience sereine a tous.
        </p>
      </div>
      <div className={styles.grid}>
        {members.map((member) => (
          <article key={member.name} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.iconWrap}>
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>{member.name}</h3>
                <p className={styles.cardRole}>{member.role}</p>
              </div>
              <p className={styles.cardDescription}>{member.focus}</p>
            </div>
            <div className={styles.cardLinks}>
              {member.links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={styles.cardLink}>
                  <FontAwesomeIcon icon={link.icon} />
                  {link.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default TeamSection
