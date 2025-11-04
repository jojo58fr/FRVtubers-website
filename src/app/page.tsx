import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEarth, faHandshake, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons'

export default function Home() {
  return (
    <>
        <div className="body-wrap">
            <header className="site-header">
                <div className="container">
                    <div className="site-header-inner">
                        <div className="brand header-brand">
                            <h1 className="m-0">
                                <a href="#">
                                    <img style={{width:"400px", height: "auto"}} className="header-logo-image" src="/FRVtubers_logo_without_subtitle.png" alt="Logo"/>
                                </a>
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                <section className="hero">
                    <div className="container">
                        <div className="hero-inner">
                            <div className="hero-copy">
                                <h1 className="hero-title mt-0">Vtubers et Fans ensembles 🇫🇷</h1>
                                <p className="hero-paragraph">Serveur communautaire de Vtubing Francophone. (Serveur VtuberFR) <br/> Retrouvez les informations sur vos créateurs préférés via le Wiki et découvrez un discord communautaire pour les fans de vtubing !</p>
                                <p className="hero-paragraph">Vous êtes créateurs/clippeur Francophone ? Cette place est aussi pour vous !</p>
                                <div className="hero-cta"><a className="button button-primary" href="https://discord.gg/meyHQYWvjU" target="_blank">Accéder à notre discord</a><a className="button" href="https://stream.frvtubers.com/" target="_blank">Accéder aux streams de la communauté</a></div>
                            </div>
                            <div className="hero-figure anime-element">
                                <svg className="placeholder" width="528" height="396" viewBox="0 0 528 396">
                                    <rect width="528" height="396" style={{fill : "transparent"}} />
                                </svg>

                                <div className="hero-figure-box hero-figure-box-06"></div>
                                <div className="hero-figure-box hero-figure-box-05"></div>
                                <div className="hero-figure-box hero-figure-box-07"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="pricing section">
                    <div className="container-sm">
                        <div className="pricing-inner section-inner">
                            <div className="pricing-header text-center">
                                <h2 className="section-title mt-0">C'est quoi FRVtubers ?</h2>
                                <p className="section-paragraph mb-0">
                                    Cette plateforme a pour vocation de réunir les communautés dévouées aux Vtubers et à leurs fans, en leur offrant un espace d'interaction et de partage.
                                </p><br/>
                                <p className="section-paragraph mb-0">
                                    Nous souhaitons vraiment créer un espace de rassemblement pensé et pour les Vtuber. Notre véritable intention est de stimuler la progression et la propagation de la culture du Vtubing au sein de la communauté francophone, en ayant défini des objectifs à court, moyen et long termes que nous nous engageons à accomplir pour concrétiser cette ambition.
                                </p>
                            </div>
                        </div>
                        </div>
                </section>

                <section className="features section">
                    <div className="container">
                        <div className="features-inner section-inner has-bottom-divider">
                        <h2 className="section-title mt-0">Quelques objectifs</h2>
                            <div className="features-wrap">
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <FontAwesomeIcon size="4x" icon={ faUsers } />
                                        </div>
                                        <h4 className="feature-title mt-24">Communauté francophone</h4>
                                        <p className="text-sm mb-0">Créations d'Évènements ou collab en lien avec des groupes communautaires Vtuber ou non</p>
                                    </div>
                                </div>
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <FontAwesomeIcon size="4x" icon={ faHandshake } />
                                        </div>
                                        <h4 className="feature-title mt-24">Représentation physique</h4>
                                        <p className="text-sm mb-0">Vulgarisation du concept de vtubing et des technologies lors de conventions, évènements..etc</p>
                                    </div>
                                </div>
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <FontAwesomeIcon size="4x" icon={ faVideo } />
                                        </div>
                                        <h4 className="feature-title mt-24">Aide aux créateurs</h4>
                                        <p className="text-sm mb-0">Vulgarisation/Documentation du vtubing, de la technologie et mise en avant de nos créateurs français sur différents réseaux (youtube, tiktok, bestof...)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta section">
                    <div className="container">
                        <div className="cta-inner section-inner">
                            <h3 className="section-title mt-0">Accéder à notre discord communautaire</h3>
                            <div className="cta-cta">
                                <a className="button button-primary button-wide-mobile" href="https://discord.gg/meyHQYWvjU" target="_blank">Clique ici</a>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta section">
                    <small style={{padding: "10px"}}>Crédit:</small> <br/>
                    <small style={{padding: "10px"}}>Merci à LunaHyu pour nous avoir autorisé l'usage du modèle féminin de <a href="https://www.twitch.tv/takudev" target="_blank">TakuDev</a>.</small>
                </section>
            </main>

            <footer className="site-footer">
                <div className="container">
                    <div className="site-footer-inner">
                        <div className="brand footer-brand">
                            <a href="#">
                                <img width="32px" className="header-logo-image" src="/FRVtubersLogo.png" alt="Logo"/>
                            </a>
                        </div>
                        <a href="https://www.startingames.org/en/"><div className="footer-copyright">&copy; 2024 Startingames</div></a>
                    </div>
                </div>
            </footer>
        </div>
    </>
  )
}