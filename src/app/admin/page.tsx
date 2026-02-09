import Link from "next/link"
import { ADMIN_PANEL_PATH, isComiteSession, requireAdminSession } from "@/lib/admin-auth"
import styles from "./page.module.scss"

export default async function AdminHomePage() {
  const session = await requireAdminSession()

  const shortcuts = [
    {
      title: "Magazines",
      description:
        "Gerer les parutions Kokori Mag, uploader les PDF et les miniatures, publier ou depublier.",
      href: `${ADMIN_PANEL_PATH}/magazines`,
    },
    {
      title: "Ressources",
      description:
        "Valider les ressources proposees sur FRVResources, mettre en avant ou supprimer.",
      href: `${ADMIN_PANEL_PATH}/ressources`,
    },
    ...(isComiteSession(session)
      ? [
          {
            title: "Comptes & roles",
            description:
              "Promouvoir des moderateurs, administrer le comite et synchroniser les droits avec les autres outils.",
            href: `${ADMIN_PANEL_PATH}/users`,
          },
        ]
      : []),
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Panel Administration</p>
          <h1 className={styles.title}>Bienvenue dans l'espace admin</h1>
          <p className={styles.subtitle}>
            Retrouve ici les outils internes FRVtubers. Choisis un module pour gerer le contenu du site.
          </p>
        </div>
      </header>

      <section className={styles.shortcuts}>
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} className={styles.card}>
            <h2>{shortcut.title}</h2>
            <p>{shortcut.description}</p>
            <span className={styles.cta}>Ouvrir</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
