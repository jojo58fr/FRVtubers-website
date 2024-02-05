import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './Website.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEarth, faHandshake, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons'

function Website() {
  const [count, setCount] = useState(0)

  return (
    <>
        <div className="body-wrap">
            <header className="site-header">
                <div className="container">
                    <div className="site-header-inner">
                        <div className="brand header-brand">
                            <h1 className="m-0">
                                <a href="#">
                                    <img style={{width:"400px", height: "auto"}} className="header-logo-image" src="./src/assets/FRVtubers_logo_without_subtitle.png" alt="Logo"/>
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
                                <p className="hero-paragraph">Serveur communautaire de Vtubing Francophone. Retrouvez les informations sur vos créateurs préférés via le Wiki et découvrez un discord communautaire pour les fans de vtubing !</p>
                                <p className="hero-paragraph">Vous êtes créateurs/clippeur Francophone ? Cette place est aussi pour vous !</p>
                                <div className="hero-cta"><a className="button button-primary" href="https://discord.gg/meyHQYWvjU" target="_blank">Accéder à notre discord</a><a className="button" href="https://www.wiki.frvtubers.com/" target="_blank">Accéder au wiki</a></div>
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
                                            {/* <img src="dist/images/feature-icon-01.svg" alt="Feature 01"/> */}
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
                                {/* <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <img src="dist/images/feature-icon-03.svg" alt="Feature 03"/>
                                        </div>
                                        <h4 className="feature-title mt-24">Be Productive</h4>
                                        <p className="text-sm mb-0">Fermentum posuere urna nec tincidunt praesent semper feugiat nibh. A arcu cursus vitae congue mauris. Nam at lectus urna duis convallis. Mauris rhoncus aenean vel elit scelerisque mauris.</p>
                                    </div>
                                </div>
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <img src="dist/images/feature-icon-04.svg" alt="Feature 04"/>
                                        </div>
                                        <h4 className="feature-title mt-24">Be Productive</h4>
                                        <p className="text-sm mb-0">Fermentum posuere urna nec tincidunt praesent semper feugiat nibh. A arcu cursus vitae congue mauris. Nam at lectus urna duis convallis. Mauris rhoncus aenean vel elit scelerisque mauris.</p>
                                    </div>
                                </div>
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <img src="dist/images/feature-icon-05.svg" alt="Feature 05"/>
                                        </div>
                                        <h4 className="feature-title mt-24">Be Productive</h4>
                                        <p className="text-sm mb-0">Fermentum posuere urna nec tincidunt praesent semper feugiat nibh. A arcu cursus vitae congue mauris. Nam at lectus urna duis convallis. Mauris rhoncus aenean vel elit scelerisque mauris.</p>
                                    </div>
                                </div>
                                <div className="feature text-center is-revealing">
                                    <div className="feature-inner">
                                        <div className="feature-icon">
                                            <img src="dist/images/feature-icon-06.svg" alt="Feature 06"/>
                                        </div>
                                        <h4 className="feature-title mt-24">Be Productive</h4>
                                        <p className="text-sm mb-0">Fermentum posuere urna nec tincidunt praesent semper feugiat nibh. A arcu cursus vitae congue mauris. Nam at lectus urna duis convallis. Mauris rhoncus aenean vel elit scelerisque mauris.</p>
                                    </div>
                                </div> */}
                            </div>
                        </div>
                    </div>
                </section>

                {/* <section className="pricing section">
                    <div className="container-sm">
                        <div className="pricing-inner section-inner">
                            <div className="pricing-header text-center">
                                <h2 className="section-title mt-0">Unlimited for all</h2>
                                <p className="section-paragraph mb-0">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut ad quis nostrud.</p>
                            </div>
                            <div className="pricing-tables-wrap">
                                <div className="pricing-table">
                                    <div className="pricing-table-inner is-revealing">
                                        <div className="pricing-table-main">
                                            <div className="pricing-table-header pb-24">
                                                <div className="pricing-table-price"><span className="pricing-table-price-currency h2">$</span><span className="pricing-table-price-amount h1">49</span><span className="text-xs">/month</span></div>
                                            </div>
                                            <div className="pricing-table-features-title text-xs pt-24 pb-24">What you will get</div>
                                            <ul className="pricing-table-features list-reset text-xs">
                                                <li>
                                                    <span>Lorem ipsum dolor sit nisi</span>
                                                </li>
                                                <li>
                                                    <span>Lorem ipsum dolor sit nisi</span>
                                                </li>
                                                <li>
                                                    <span>Lorem ipsum dolor sit nisi</span>
                                                </li>
                                                <li>
                                                    <span>Lorem ipsum dolor sit nisi</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="pricing-table-cta mb-8">
                                            <a className="button button-primary button-shadow button-block" href="#">Pre order now</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>  */}

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
                    <small style={{padding: "10px"}}>Merci à <a href="https://www.twitch.tv/lunahyu" target="_blank">LunaHyu</a> pour nous avoir autorisé l'usage du modèle féminin de <a href="https://www.twitch.tv/takudev" target="_blank">TakuDev</a>.</small>
                </section>
            </main>

            <footer className="site-footer">
                <div className="container">
                    <div className="site-footer-inner">
                        <div className="brand footer-brand">
                            <a href="#">
                                <img width="32px" className="header-logo-image" src="./FRVtubersLogo.png" alt="Logo"/>
                            </a>
                        </div>
                        {/* <ul className="footer-links list-reset">
                            <li>
                                <a href="#">Contact</a>
                            </li>
                            <li>
                                <a href="#">About us</a>
                            </li>
                            <li>
                                <a href="#">FAQ's</a>
                            </li>
                            <li>
                                <a href="#">Support</a>
                            </li>
                        </ul> */}
                         <ul className="footer-social-links list-reset">
                            {/*<li>
                                <a href="#">
                                    <span className="screen-reader-text">Facebook</span>
                                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6.023 16L6 9H3V6h3V4c0-2.7 1.672-4 4.08-4 1.153 0 2.144.086 2.433.124v2.821h-1.67c-1.31 0-1.563.623-1.563 1.536V6H13l-1 3H9.28v7H6.023z" fill="#0270D7"/>
                                    </svg>
                                </a>
                            </li>
                            <li>
                                <a href="#">
                                    <span className="screen-reader-text">Twitter</span>
                                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16 3c-.6.3-1.2.4-1.9.5.7-.4 1.2-1 1.4-1.8-.6.4-1.3.6-2.1.8-.6-.6-1.5-1-2.4-1-1.7 0-3.2 1.5-3.2 3.3 0 .3 0 .5.1.7-2.7-.1-5.2-1.4-6.8-3.4-.3.5-.4 1-.4 1.7 0 1.1.6 2.1 1.5 2.7-.5 0-1-.2-1.5-.4C.7 7.7 1.8 9 3.3 9.3c-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.3 3.1 2.3-1.1.9-2.5 1.4-4.1 1.4H0c1.5.9 3.2 1.5 5 1.5 6 0 9.3-5 9.3-9.3v-.4C15 4.3 15.6 3.7 16 3z" fill="#0270D7"/>
                                    </svg>
                                </a>
                            </li>
                            <li>
                                <a href="#">
                                    <span className="screen-reader-text">Google</span>
                                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.9 7v2.4H12c-.2 1-1.2 3-4 3-2.4 0-4.3-2-4.3-4.4 0-2.4 2-4.4 4.3-4.4 1.4 0 2.3.6 2.8 1.1l1.9-1.8C11.5 1.7 9.9 1 8 1 4.1 1 1 4.1 1 8s3.1 7 7 7c4 0 6.7-2.8 6.7-6.8 0-.5 0-.8-.1-1.2H7.9z" fill="#0270D7"/>
                                    </svg>
                                </a>
                            </li>*/}
                        </ul> 
                        <div className="footer-copyright">&copy; 2024 Startingames origins</div>
                    </div>
                </div>
            </footer>
        </div>

    </>
  )
}

export default Website
