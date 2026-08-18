// ============================================================
// DONNÉES CENTRALISÉES DES PROCÉDURES — VÉLOC'ANNECY
// Chaque entrée = une procédure unique affichée via procedure.html?id=xxx
// ============================================================

const PROCEDURES_DATA = [
    // ==================== 1. EXPLOITATION ====================
    {
        id: 'ouverture-magasin',
        title: 'Ouverture du magasin',
        category: 'Exploitation',
        emoji: '🗝️',
        search: 'ouverture magasin entrer intérieur bâtiment clé porte lumière tableau électrique pastilles vertes batterie salle de charge support à roulette étagère cadenas chaîne en U porte EXT VAE nakamura bleu drapeau câble noir mousqueton code',
        body: `
            <ol class="proc-steps">
                <li><strong>Entrer par l'intérieur du bâtiment</strong> avec la clé (voir image).</li>
                <li><strong>Ouvrir la porte intérieure du magasin</strong> avec cette clé (voir image).</li>
                <li>
                    <strong>Allumer les lumières :</strong>
                    <ol class="proc-substeps">
                        <li>Ouvrir le tableau électrique.</li>
                        <li>Lever les interrupteurs marqués par des pastilles vertes.</li>
                        <li>Refermer le tableau.</li>
                    </ol>
                </li>
                <li>
                    <strong>Gérer les batteries :</strong>
                    <ol class="proc-substeps">
                        <li>Se rendre dans la salle de charge.</li>
                        <li>Débrancher les batteries.</li>
                        <li>Transporter les batteries grâce au support à roulette (voir photo).</li>
                        <li>Déposer les batteries sur l'étagère à l'entrée du magasin et les mettre sur certains vélos.</li>
                    </ol>
                </li>
                <li>
                    <strong>Ouvrir la porte :</strong>
                    <ol class="proc-substeps">
                        <li>Ouvrir le cadenas à chaîne : la clé se trouve dessus.</li>
                        <li>Ouvrir le cadenas en U : la clé se trouve dessus.</li>
                        <li>Ouvrir la porte de droite avec la clé « porte EXT ».</li>
                    </ol>
                </li>
                <li><strong>Sortir les 5 VAE Nakamura bleu</strong> (voir photo) et le drapeau devant le magasin (voir photo), puis attacher les vélos avec le câble noir et le mousqueton à code (voir photo).</li>
            </ol>
            <div class="proc-tip">💡 Les clés des cadenas sont toujours dessus. Pensez à les reposer après l'ouverture.</div>
        `
    },
    {
        id: 'fermeture-magasin',
        title: 'Fermeture du magasin',
        category: 'Exploitation',
        emoji: '🔒',
        search: 'fermeture magasin groupe dehors référent vélos drapeau cadenas en U chaîne porte EXT batterie lumières porte intérieur double tour clés porte claque',
        body: `
            <ol class="proc-steps">
                <li><strong>Lorsqu'il n'y a plus aucun groupe dehors</strong>, prévenir le référent.</li>
                <li>
                    <strong>À l'heure de fermeture du magasin :</strong>
                    <ol class="proc-substeps">
                        <li>Commencer à rentrer les vélos de dehors et le drapeau.</li>
                        <li>Fermer la porte avec le cadenas en U.</li>
                        <li>Fermer avec le cadenas à chaîne.</li>
                        <li>Fermer la porte de droite avec la clé « porte EXT ».</li>
                    </ol>
                </li>
                <li><strong>Gérer les batteries</strong> (cf. guide gestion des batteries).</li>
                <li><strong>Éteindre les lumières.</strong></li>
                <li><strong>Sortir par la porte intérieure du magasin</strong> et fermer à double tour (ne pas oublier les clés car porte qui se claque).</li>
            </ol>
            <div class="proc-warn">⚠️ Ne pas oublier les clés en sortant : la porte se claque.</div>
        `
    },

    // ==================== 2. ACCUEIL & RETOUR ====================
    {
        id: 'accueil-client',
        title: 'Accueil du client',
        category: 'Accueil & Retour',
        emoji: '👋',
        search: 'accueil client réservation application prénom heure récap venue explication location classique électrique disponibilité tarifs flyer paiement retour caution pièce d identité carte passeport permis carte vitale empreinte bancaire longue durée accessoires casque obligatoire enfant 12 ans panier affluence cadenas dehors attendre extérieur',
        body: `
            <p><strong>1. Demander s'ils ont une réservation</strong></p>
            <ol class="proc-steps">
                <li>
                    <strong>Si oui :</strong>
                    <ol class="proc-substeps">
                        <li>Retrouver la réservation via l'application de réservation grâce au prénom et à l'heure.</li>
                        <li>Faire le récap de la réservation : « Il y a 2 VTC et 1 VAE, c'est bien ça ? »</li>
                        <li>Valider la réservation « Venue ».</li>
                    </ol>
                </li>
                <li><strong>Si non :</strong> passer directement à l'étape 2.</li>
            </ol>

            <p><strong>2. Explication fonctionnement location</strong></p>
            <ol class="proc-steps">
                <li>Demander le type de vélo : « Classique ou électrique ? »</li>
                <li>S'assurer qu'il reste des vélos disponibles.</li>
                <li>Montrer les tarifs de location sur le flyer : « Vous avez tous les tarifs sur le petit flyer juste ici. »</li>
                <li>Informer le client que « le paiement se fait au retour de la balade ».</li>
            </ol>

            <p><strong>3. Prise de caution</strong></p>
            <ol class="proc-steps">
                <li>Demander une <strong>pièce d'identité physique</strong> : une pièce d'identité par groupe, uniquement carte d'identité, passeport, permis de conduire ou carte vitale.</li>
                <li>Si pas de pièce d'identité : faire une <strong>empreinte bancaire</strong> (dépôt de garantie / caution) avec la carte de crédit physique à insérer dans le TPE (cf. empreinte bancaire).</li>
                <li>Pour les locations <strong>longue durée</strong> (au-delà d'une journée), toujours prendre une empreinte bancaire (cf. empreinte bancaire).</li>
            </ol>

            <p><strong>4. Proposer les accessoires</strong></p>
            <ol class="proc-steps">
                <li><strong>Casques :</strong> « C'est recommandé mais pas obligatoire pour les adultes, c'est comme vous voulez. » — « Obligatoire pour les enfants de moins de 12 ans. »</li>
                <li>
                    <strong>Panier :</strong> « Est-ce que je vous mets des paniers sur les vélos ? »
                    <ul>
                        <li>S'il y a encore des vélos avec support panier.</li>
                        <li>Par jour de forte affluence, proposer un panier pour 2 vélos. Ex : proposer 3 paniers pour 6 vélos.</li>
                    </ul>
                </li>
                <li><strong>Cadenas :</strong> toujours donner un cadenas une fois que les clients sont dehors (un pour 2 vélos).</li>
            </ol>

            <p><strong>5.</strong> Une fois les accessoires proposés, demander aux clients d'<strong>attendre à l'extérieur</strong>.</p>

            <div class="proc-info">ℹ️ Pièces d'identité acceptées : carte d'identité, passeport, permis de conduire ou carte vitale. Une seule pièce par groupe.</div>
            <div class="proc-warn">⚠️ Pas de pièce d'identité valable → empreinte bancaire obligatoire. Pour toute location au-delà d'une journée, l'empreinte bancaire est toujours requise.</div>
        `
    },
    {
        id: 'brief-depart',
        title: 'Brief de départ',
        category: 'Accueil & Retour',
        emoji: '🗺️',
        search: 'brief départ VAE fonctionnement vélo musculaire pédaler assistance écran allumé blanc beige power plus moins modes NCM noir autonomie niveaux assistance vitesses mécaniques gâchette dénivelé flyer tour du lac sens horaire veyrier menthon talloires côte piste cyclable pointillés faux plat montant descente raide virages flèche verte panne mécanique numéro boutique QR code départ gauche vitres paiement retour fermeture questions bonne route',
        body: `
            <p><strong>1. Si VAE, explication du fonctionnement</strong></p>
            <ol class="proc-steps">
                <li>Le VAE fonctionne comme un vélo musculaire : il faut juste <strong>pédaler pour activer l'assistance</strong>, et l'écran doit être allumé :
                    <ul>
                        <li><strong>VAE blancs/beiges :</strong> bouton « Power » situé au-dessus de l'écran, boutons + et − situés sous l'écran pour changer les modes.</li>
                        <li><strong>Autres VAE :</strong> allumer la batterie, puis allumer l'écran.</li>
                    </ul>
                </li>
                <li>Différents niveaux d'assistance (représentés différemment suivant les vélos), en haut à droite de l'écran (en bas à gauche sur NCM noir) :</li>
            </ol>

            <div class="proc-table-container">
                <table class="proc-table">
                    <thead>
                        <tr>
                            <th>Mode</th>
                            <th>0 / OFF / BLANC</th>
                            <th>1 / ÉCO / VERT</th>
                            <th>AUTO (recommandé)</th>
                            <th>2/3 / TOUR / BLEU</th>
                            <th>4 / JAUNE</th>
                            <th>5 / TURBO / ROUGE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Autonomie</strong></td>
                            <td>∞</td>
                            <td>60 km</td>
                            <td>60 km</td>
                            <td>40 km</td>
                            <td>30 km</td>
                            <td>20 km</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p style="font-size: 0.85rem; font-style: italic; color: var(--text);">Autonomie moyenne d'une batterie chargée à 100% pour un individu de poids moyen (75 kg) sur un parcours plat (type tour du lac) avec une fréquence de pédalage régulière.</p>

            <ol class="proc-steps" style="counter-reset: proc-step 2;">
                <li>Changer les <strong>vitesses mécaniques</strong> en plus de l'assistance, selon le dénivelé, une par une et en pédalant :
                    <ul>
                        <li>La <strong>grande gâchette</strong> : diminue la difficulté de pédalage.</li>
                        <li>La <strong>petite gâchette</strong> : augmente la difficulté de pédalage.</li>
                        <li>Vitesse 1 la plus facile, 8 la plus dure.</li>
                    </ul>
                </li>
            </ol>

            <p><strong>2. À l'aide du flyer, procéder à l'explication du tour du lac</strong></p>
            <ol class="proc-steps">
                <li>Faire le tour dans le <strong>sens horaire</strong> (Veyrier, Menthon, Talloires) pour éviter la grande côte de Talloires.</li>
                <li>Piste cyclable tout autour du lac, <strong>sauf sur les pointillés</strong>.</li>
                <li>Entre Menthon et Talloires : <strong>4 km</strong> plus durs que du faux plat montant.</li>
                <li>Faire attention dans la <strong>descente de Talloires</strong> car la pente est très raide avec des virages serrés.</li>
                <li>Au bout du lac : suivre la <strong>flèche verte</strong> (voir photo sur la carte) pour rejoindre la direction d'Annecy.</li>
                <li>En cas de <strong>panne mécanique</strong> : « Vous avez le numéro de la boutique ou le QR code juste ici (sur le flyer). »</li>
                <li>Pour commencer côté gauche depuis ici : « C'est tout droit puis juste après le bâtiment avec les vitres, vous prenez à gauche. »</li>
                <li>Rappeler que le <strong>paiement se fait au retour</strong>.</li>
                <li>Rappeler l'<strong>heure de fermeture</strong> en vigueur.</li>
                <li>Finir par : « Est-ce que vous avez des questions ? Ou c'est tout bon pour vous ? » — « Bonne route ! »</li>
            </ol>

            <div class="proc-tip">💡 Le mode AUTO est recommandé pour la plupart des clients : il gère l'assistance tout seul.</div>
        `
    },
    {
        id: 'retour-client',
        title: 'Retour du client',
        category: 'Accueil & Retour',
        emoji: '🔄',
        search: 'retour client rebonjour tout s est bien passé récupérer vélos casse défaut vérification ranger emplacement accessoires casque cadenas',
        body: `
            <ol class="proc-steps">
                <li>Se diriger vers les clients à l'extérieur : « <strong>Rebonjour, tout s'est bien passé ?</strong> »</li>
                <li><strong>Récupérer les vélos.</strong></li>
                <li>S'assurer qu'il n'y a <strong>pas de casse ou de défaut</strong> sur le vélo (cf. vérification des vélos).</li>
                <li>Les ranger à leur <strong>emplacement</strong> (cf. rangement des vélos).</li>
                <li>Récupérer et ranger les <strong>accessoires</strong> (casque et cadenas).</li>
            </ol>
        `
    },

    // ==================== 3. COMMANDES ====================
    {
        id: 'enregistrement-commandes',
        title: 'Enregistrement des commandes',
        category: 'Commandes & Encaissement',
        emoji: '📝',
        search: 'enregistrement commande Sumup bouton plus nouvelle commande prénom pièce identité empreinte heure départ arrondir 5 min nombre clients vélos sièges enfant valider catégories article 0 transmettre bouton vert tiroir droit pile',
        body: `
            <ol class="proc-steps">
                <li>Une fois le brief terminé, retourner à la caisse afin d'<strong>enregistrer la commande</strong>.</li>
                <li>Dans l'application <strong>SumUp</strong>, appuyer sur le bouton <strong>+</strong> (nouvelle commande).</li>
                <li>
                    <strong>Saisir :</strong>
                    <ul>
                        <li><strong>Prénom</strong> de la pièce d'identité (ou l'empreinte bancaire).</li>
                        <li><strong>Heure de départ</strong> (arrondir à 5 min, ex : il est 9h07 → écrire 9h10).</li>
                        <li><strong>Nombre de clients</strong> (nombre de vélos, les sièges enfant ne comptent pas).</li>
                        <li>Ex : « William 9h10 » (2 clients).</li>
                    </ul>
                </li>
                <li><strong>Valider la commande</strong>, puis ajouter le type et le nombre de vélos via les catégories. Ex : 2 VAE, 2 VTC (article à 0 €).</li>
                <li><strong>Transmettre la commande</strong> (bouton vert en bas à droite).</li>
                <li><strong>Ranger la pièce d'identité</strong> dans le tiroir de droite au-dessus de la pile correspondante.</li>
            </ol>
            <div class="proc-tip">💡 Arrondissez toujours l'heure de départ à 5 minutes près pour simplifier le suivi et l'encaissement.</div>
        `
    },
    {
        id: 'encaissement',
        title: 'Encaissement',
        category: 'Commandes & Encaissement',
        emoji: '💰',
        search: 'encaissement prénom SumUp commande prénom double heure départ récapitulatif balade chrono total produits durée VAE 2 à 4h 34€ carte débit TPE bouton vert payé valider refusé ticket abandon espèces monnaie calculette logiciel pièce identité rendre bas pile',
        body: `
            <ol class="proc-steps">
                <li>À la caisse : demander le <strong>prénom de la pièce d'identité</strong> au client.</li>
                <li>Depuis la tablette sur <strong>SumUp</strong>, retrouver le prénom du client.</li>
                <li><strong>Ouvrir la commande correspondante</strong> (attention au prénom en double : demander l'heure de départ pour être sûr).</li>
                <li>
                    <strong>Faire le récapitulatif de la balade :</strong>
                    <div class="proc-info" style="margin-top: 10px;">
                        « Vous êtes parti à 11h20, il y avait 2 vélos électriques. Vous avez fait 3h40 (voir chrono sur la caisse) donc entre 2 et 4h pour les 2 vélos électriques, ça nous fait un total de 64 € s'il vous plaît. Vous souhaitez régler comment ? »
                    </div>
                </li>
                <li><strong>Ajouter les produits avec montant</strong> en fonction de la durée (si 2 VAE entre 2 et 4h, ajouter 2 × VAE 2 à 4h (34 €) à la commande).</li>
                <li>
                    <strong>Encaisser le client :</strong>
                    <ul>
                        <li>
                            <strong>Par carte :</strong>
                            <ol class="proc-substeps">
                                <li>S'assurer d'être sur la transaction « DÉBIT » (par défaut).</li>
                                <li>Taper le montant sur le TPE.</li>
                                <li>Valider avec le bouton vert.</li>
                                <li>Faire payer le client.</li>
                                <li>Vérifier que le paiement est validé. Si paiement refusé : montrer et proposer le ticket d'abandon.</li>
                                <li>Proposer le ticket de carte.</li>
                            </ol>
                        </li>
                        <li><strong>Par espèces :</strong> mettre l'argent dans la caisse puis rendre la monnaie (utiliser la calculette du logiciel SumUp pour calculer la monnaie à rendre).</li>
                    </ul>
                </li>
                <li><strong>Retrouver la pièce d'identité</strong> du client et lui rendre.</li>
            </ol>
            <div class="proc-tip">💡 Les pièces d'identité des groupes partis le matin sont généralement tout en bas de la pile, et inversement.</div>
        `
    },

    // ==================== 4. VÉLOS & GUIDES ====================
    {
        id: 'preparation-velos',
        title: 'Préparation des vélos',
        category: 'Vélos & Guides',
        emoji: '🔧',
        search: 'préparation vélo classique VTC taille client 1m50 1m65 S 1m65 1m85 M 1m85 2m00 L accroche panier électrique VAE 1m50 1m70 S/M 26p 1m70 2m00 M/L 28p batterie cadre clips spécifique pleine afficheur clé mur des clés droite caisse vérification emplacements départ hauteur selle collier rapide hanche tige de selle limite endommagement cadre',
        body: `
            <p><strong>1. Vélo classique (VTC)</strong></p>
            <ol class="proc-steps">
                <li>
                    <strong>Choisir la taille du vélo en fonction du client</strong> (cf. guide VTC) :
                    <div class="proc-table-container">
                        <table class="proc-table">
                            <thead>
                                <tr>
                                    <th>Taille client</th>
                                    <th>Taille vélo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1m50 à 1m65</td><td><strong>S</strong></td></tr>
                                <tr><td>1m65 à 1m85</td><td><strong>M</strong></td></tr>
                                <tr><td>1m85 à 2m00</td><td><strong>L</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                </li>
                <li>Choisir en fonction de l'<strong>accroche panier</strong>, si le client a demandé un panier.</li>
            </ol>

            <p><strong>2. Vélo électrique (VAE)</strong></p>
            <ol class="proc-steps">
                <li>
                    <strong>Choisir la taille du vélo en fonction du client</strong> (cf. guide VAE) :
                    <div class="proc-table-container">
                        <table class="proc-table">
                            <thead>
                                <tr>
                                    <th>Taille client</th>
                                    <th>Taille vélo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1m50 à 1m70</td><td><strong>S/M (26p)</strong></td></tr>
                                <tr><td>1m70 à 2m00</td><td><strong>M/L (28p)</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                </li>
                <li>Choisir en fonction de l'<strong>accroche panier</strong>, si le client a demandé un panier.</li>
                <li>Insérer la <strong>batterie</strong> dans le cadre jusqu'au « clips ».</li>
                <li>Chaque modèle de VAE dispose d'une <strong>batterie spécifique</strong> (cf. guide VAE).</li>
                <li>Vérifier que la batterie est <strong>pleine</strong> via l'afficheur.</li>
                <li><strong>Retirer et ranger la clé</strong> sur le mur des clés à droite de la caisse.</li>
            </ol>

            <p><strong>3.</strong> Procéder à la <strong>vérification des vélos</strong> (cf. vérification des vélos).</p>
            <p><strong>4.</strong> Apporter les vélos à l'extérieur à un des <strong>emplacements de départ</strong> (cf. emplacements de départ).</p>
            <p><strong>5.</strong> Expliquer au client comment régler la hauteur de la selle : « Vous avez juste à ouvrir le <strong>collier de selle rapide</strong> et changer la hauteur de la selle, c'est souvent légèrement en dessous de la hanche. »</p>

            <div class="proc-warn">⚠️ Très important : faire attention à la <strong>hauteur limite de la tige de selle</strong> (voir photo), car risque d'endommagement du cadre.</div>
        `
    },
    {
        id: 'verification-velos',
        title: 'Vérification des vélos',
        category: 'Vélos & Guides',
        emoji: '🔍',
        search: 'vérification vélo freins lâche frottements roue ralentit direction guidon aligné jeu frein avant secouer pression pneus doigts flanc 3 bars roues voilage selle inclinée avancée reculée béquille serrée frotte roue AR problème retourner selle côté feutre blanc référent',
        body: `
            <ol class="proc-steps">
                <li><strong>Freins :</strong> pas trop lâches, pas de frottements (roue qui ralentit trop vite quand tournée dans le vide).</li>
                <li><strong>Direction :</strong> guidon aligné avec la roue, pas de jeu dans la direction. Pour se faire : freiner avec le frein avant et secouer le vélo d'avant en arrière.</li>
                <li><strong>Pression des pneus :</strong> en appuyant avec ses doigts sur le flanc du pneu, max. 3 bars.</li>
                <li><strong>Roues :</strong> pas de voilage, pas de jeu dans les roues.</li>
                <li><strong>Selle :</strong> pas de jeu dans la selle, pas trop inclinée (haut, bas), pas trop avancée ou reculée.</li>
                <li><strong>Béquille :</strong> bien serrée, qui ne frotte pas sur la roue AR.</li>
                <li>
                    Si un problème est détecté, <strong>retourner la selle</strong> du vélo et le mettre de côté pour ne pas gêner le reste du service :
                    <ul>
                        <li>Écrire le <strong>type de problème sur la selle avec un feutre blanc</strong> (ex : frein AR faible ou vitesses passent mal).</li>
                    </ul>
                </li>
            </ol>
            <div class="proc-info">ℹ️ En cas de doute, poser la question à un <strong>référent</strong>.</div>
        `
    },
    {
        id: 'rangement-velos',
        title: 'Rangement des vélos',
        category: 'Vélos & Guides',
        emoji: '🅿️',
        search: 'rangement vélo encaissé retirer accessoires paniers cadenas désinfecter casques spray VAE batteries charger quinconce sans béquille pédale précédent sous cadre VTC classique taille support panier selle emboîtement',
        body: `
            <ol class="proc-steps">
                <li>Après avoir encaissé un client, <strong>retirer les accessoires</strong> des vélos (paniers, cadenas).</li>
                <li><strong>Désinfecter les casques</strong> en les pulvérisant une fois avec le spray adéquat.</li>
                <li>
                    <strong>Rangement des VAE :</strong>
                    <ol class="proc-substeps">
                        <li>Retirer les batteries puis les <strong>mettre à charger</strong> (cf. guide gestion des batteries).</li>
                        <li>Les ranger les uns contre les autres <strong>en quinconce</strong> (sans la béquille) avec la <strong>pédale du vélo précédent sous le cadre du vélo suivant</strong> (voir photos).</li>
                    </ol>
                </li>
                <li>
                    <strong>Rangement des vélos classiques (VTC) :</strong>
                    <ol class="proc-substeps">
                        <li>Par taille (voir photos).</li>
                        <li>S'il possède un support panier.</li>
                        <li>Rangement en <strong>quinconce</strong> (sans la béquille) avec la <strong>pédale du vélo précédent sous le cadre du vélo suivant</strong>.</li>
                    </ol>
                </li>
            </ol>
            <div class="proc-tip">💡 Si mauvais emboîtement des vélos : diminuer la <strong>hauteur de la selle</strong> du vélo précédent et vérifier que rien ne bloque.</div>
        `
    },
    {
        id: 'guide-vtc',
        title: 'Guide VTC',
        category: 'Vélos & Guides',
        emoji: '🚵',
        search: 'guide VTC Riverside 120 gris 500 bleu foncé cadre bas bleu taille S ergot au dessus barre droite M légèrement en dessous L en dessous taille unique',
        body: `
            <p><strong>2 types de VTC :</strong></p>
            <div class="proc-table-container">
                <table class="proc-table">
                    <thead>
                        <tr>
                            <th>Modèle</th>
                            <th>Tailles disponibles</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>Riverside 120</strong> (gris)</td><td>3 tailles : S, M, L</td></tr>
                        <tr><td><strong>Riverside 500</strong> (bleu foncé)</td><td>3 tailles : S, M, L</td></tr>
                        <tr><td><strong>Riverside 500 cadre bas</strong> (bleu)</td><td>Taille unique : <strong>M</strong></td></tr>
                    </tbody>
                </table>
            </div>
            <p><strong>Repérage des tailles (Riverside 120 et 500) :</strong></p>
            <ul>
                <li><strong>S :</strong> ergot au-dessus de la barre droite du cadre.</li>
                <li><strong>M :</strong> ergot très légèrement en dessous de la barre droite du cadre.</li>
                <li><strong>L :</strong> ergot en dessous de la barre droite du cadre.</li>
            </ul>
        `
    },
    {
        id: 'guide-vae',
        title: 'Guide VAE',
        category: 'Vélos & Guides',
        emoji: '⚡',
        search: 'guide VAE 5 types SUNN blanc moteur pédalier autonomie 70 km siège bébé compatible NCM noir moteur roue AR 80 km incompatible beige 100 km Naka bleu 60 km compatible beige 60 km incompatible',
        body: `
            <p><strong>5 types de VAE :</strong></p>
            <div class="proc-table-container">
                <table class="proc-table">
                    <thead>
                        <tr>
                            <th>Modèle</th>
                            <th>Moteur</th>
                            <th>Autonomie</th>
                            <th>Siège bébé</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>SUNN blanc</strong></td><td>Moteur pédalier</td><td>70 km</td><td>Compatible ✅</td></tr>
                        <tr><td><strong>NCM noir</strong></td><td>Moteur roue AR</td><td>80 km</td><td>Incompatible ❌</td></tr>
                        <tr><td><strong>NCM beige</strong></td><td>Moteur roue AR</td><td>100 km</td><td>Incompatible ❌</td></tr>
                        <tr><td><strong>Naka bleu</strong></td><td>Moteur roue AR</td><td>60 km</td><td>Compatible ✅</td></tr>
                        <tr><td><strong>Naka beige</strong></td><td>Moteur roue AR</td><td>60 km</td><td>Incompatible ❌</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="proc-warn">⚠️ Chaque modèle de VAE dispose d'une <strong>batterie spécifique</strong> : vérifier la bonne correspondance (cf. guide gestion des batteries).</div>
        `
    },
    {
        id: 'emplacements-depart',
        title: 'Emplacements de départ',
        category: 'Vélos & Guides',
        emoji: '📍',
        search: 'emplacements départ 5 droite entrée 2 vélos droite petit arbre 6 face magasin grand petit arbre 8 gauche grand arbre 5 gauche entrée vitrine 6',
        body: `
            <p><strong>Il existe 5 emplacements de départ</strong> (voir photo) :</p>
            <ul>
                <li>À droite de l'entrée <strong>(2 vélos max)</strong>.</li>
                <li>À droite du petit arbre <strong>(6 vélos max)</strong>.</li>
                <li>En face du magasin, entre le grand et le petit arbre <strong>(8 vélos max)</strong>.</li>
                <li>À gauche du grand arbre <strong>(5 vélos max)</strong>.</li>
                <li>À gauche de l'entrée, collé à la vitrine <strong>(6 vélos max)</strong>.</li>
            </ul>
            <div class="proc-tip">💡 Respectez les capacités de chaque emplacement pour garder un trottoir ordonné et accessible.</div>
        `
    },

    // ==================== 5. CAUTION ====================
    {
        id: 'ouverture-caution',
        title: 'Ouverture de caution (pré-autorisation)',
        category: 'Empreinte bancaire & Cautions',
        emoji: '💳',
        search: 'ouverture caution empreinte bancaire pré-autorisation changer service touche violette TPE saisir montant tableau empreinte valider imprimer ticket client commerçant conserver précieusement prénom type nombre vélos dos ticket commerçant ranger cartes identité tiroir droite enregistrer commande SumUp EB mention',
        body: `
            <ol class="proc-steps">
                <li><strong>Changer service</strong> (touche violette sur l'écran du TPE) → <strong>pré-autorisation</strong>.</li>
                <li><strong>Saisir le bon montant</strong> (cf. tableau des cautions) → valider.</li>
                <li><strong>Toujours imprimer le ticket client et commerçant</strong> → donner le ticket client → leur dire de le conserver précieusement.</li>
                <li><strong>Écrire le prénom et le type/nombre de vélos</strong> au dos du ticket commerçant.</li>
                <li><strong>Ranger le ticket</strong> à côté des cartes d'identité (dans le tiroir de droite).</li>
                <li><strong>Enregistrer la commande</strong> dans SumUp avec la mention <strong>EB</strong> (ex : William 10h05 EB).</li>
            </ol>
            <div class="proc-warn">⚠️ Le ticket client est indispensable à la clôture de caution. Insistez auprès du client pour qu'il le conserve précieusement.</div>
        `
    },
    {
        id: 'cloture-caution',
        title: 'Clôture de caution',
        category: 'Empreinte bancaire & Cautions',
        emoji: '✅',
        search: 'clôture caution changer service touche violette changer transaction touche verte clôture saisir 0 détérioré valider numéro dossier bas ticket vérifier montant final 0 donner ticket preuve débité',
        body: `
            <ol class="proc-steps">
                <li><strong>Changer service</strong> (touche violette sur l'écran du TPE) → <strong>changer transaction</strong> (touche verte sur l'écran du TPE) → <strong>clôture</strong>.</li>
                <li><strong>Saisir 0</strong> (si le vélo n'a pas été détérioré) → valider.</li>
                <li><strong>Entrer le numéro de dossier</strong> (situé au bas du ticket de caution).</li>
                <li><strong>Vérifier que le montant final est de 0 €</strong> avant de valider à nouveau → valider.</li>
                <li><strong>Donner le ticket au client</strong> → montrer la preuve de clôture (montant débité : 0 €).</li>
            </ol>
            <div class="proc-warn">⚠️ Si le vélo a été détérioré, contactez le référent avant toute clôture avec un montant.</div>
        `
    },
    {
        id: 'tableau-cautions',
        title: 'Tableau des cautions',
        category: 'Empreinte bancaire & Cautions',
        emoji: '📋',
        search: 'tableau cautions montant VAE 1000 vélo route VTC 300 enfant 200 tandem 1000',
        body: `
            <table class="proc-table">
                <thead>
                    <tr>
                        <th>VAE / Vélo de route</th>
                        <th>VTC</th>
                        <th>Enfant</th>
                        <th>Tandem</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>1000 €</strong></td>
                        <td><strong>300 €</strong></td>
                        <td><strong>200 €</strong></td>
                        <td><strong>1000 €</strong></td>
                    </tr>
                </tbody>
            </table>
            <div class="proc-info">ℹ️ Utilisez ce tableau pour saisir le bon montant lors de l'ouverture d'une pré-autorisation.</div>
        `
    },

    // ==================== 6. ACCESSOIRES ====================
    {
        id: 'cadenas',
        title: 'Cadenas : types & changement de code',
        category: 'Accessoires & Équipements',
        emoji: '🔐',
        search: 'cadenas type 4 types jaune long 1 pour 2 vélos jaune court 1 par vélo gris long gris court changement code combinaison ouvrir molette noire série chiffres entrer nouvelle position initiale vérifier ouvrir fermer montrer noter photo',
        body: `
            <p><strong>Type de cadenas — 4 types :</strong></p>
            <ul>
                <li><strong>Cadenas jaune long :</strong> 1 pour 2 vélos.</li>
                <li><strong>Cadenas jaune court :</strong> 1 par vélo.</li>
                <li><strong>Cadenas gris long :</strong> 1 pour 2 vélos.</li>
                <li><strong>Cadenas gris court :</strong> 1 pour 2 vélos.</li>
            </ul>

            <p><strong>Changement du code du cadenas :</strong></p>
            <ol class="proc-steps">
                <li>Saisir la bonne combinaison.</li>
                <li><strong>Ouvrir le cadenas.</strong></li>
                <li><strong>Tourner la molette noire</strong> (au bout de la série de chiffres).</li>
                <li><strong>Entrer la nouvelle combinaison.</strong></li>
                <li><strong>Tourner la molette noire</strong> à sa position initiale.</li>
                <li><strong>Vérifier</strong> que le cadenas s'ouvre et se ferme correctement.</li>
                <li><strong>Montrer la combinaison</strong> au client.</li>
                <li>Lui demander de le <strong>noter</strong> ou de le <strong>prendre en photo</strong>.</li>
            </ol>
        `
    },
    {
        id: 'panier',
        title: 'Insérer / retirer un panier',
        category: 'Accessoires & Équipements',
        emoji: '🧺',
        search: 'panier insérer retirer grandes encoches fixations attaches coulisser bas clic bouton rouge taper décrocher',
        body: `
            <p><strong>Insérer le panier :</strong></p>
            <ol class="proc-steps">
                <li>Placer les <strong>grandes encoches</strong> du panier sur les fixations des attaches paniers sur les vélos.</li>
                <li>Faire <strong>coulisser le panier vers le bas</strong> jusqu'à entendre un <strong>clic</strong>.</li>
            </ol>

            <p><strong>Retirer le panier :</strong></p>
            <ol class="proc-steps">
                <li>Appuyer et <strong>maintenir le bouton rouge</strong>.</li>
                <li><strong>Taper le bas du panier</strong> pour le décrocher.</li>
            </ol>
            <div class="proc-info">ℹ️ Par forte affluence, proposer un panier pour 2 vélos (ex : 3 paniers pour 6 vélos).</div>
        `
    },
    {
        id: 'siege-bebe',
        title: 'Installation du siège bébé',
        category: 'Accessoires & Équipements',
        emoji: '👶',
        search: 'siège bébé VAE compatible SUNN Naka bleu écarter parois vis à main gauche poser porte bagage milieu ni trop loin ni trop près selle resserrer parois cordon sécurité tige de selle vérifier fixer tirer taper',
        body: `
            <p><strong>Uniquement sur les VAE compatibles (SUNN et Naka bleu).</strong></p>
            <ol class="proc-steps">
                <li><strong>Écarter les parois du siège</strong> grâce à la vis à main située à gauche du siège.</li>
                <li><strong>Poser le siège</strong> sur le porte-bagage du VAE.</li>
                <li><strong>Placer le siège au milieu</strong> du porte-bagage, ni trop loin, ni trop près de la selle.</li>
                <li><strong>Resserrer fermement</strong> les parois du siège.</li>
                <li><strong>Faire passer le cordon de sécurité</strong> dans la tige de selle, puis resserrer le cordon.</li>
                <li><strong>S'assurer que le siège est correctement fixé</strong> : tirer et taper le siège pour vérifier la bonne fixation.</li>
            </ol>
            <div class="proc-warn">⚠️ Siège bébé incompatible sur les NCM noir, NCM beige et Naka beige.</div>
        `
    },

    // ==================== 7. GESTION ====================
    {
        id: 'periodes-creuses',
        title: 'Périodes creuses',
        category: 'Périodes creuses & Batteries',
        emoji: '🧹',
        search: 'périodes creuses magasin vélos propres bien tenus balais intérieur extérieur boissons frigo espace flyer réassortir surveiller batteries branches déchargées débrancher pleines étagère batterie nettoyer vélos sales microfibre produit gardes boues fourche cadre jantes AV AR',
        body: `
            <p><strong>Consigne générale :</strong> le magasin et les vélos doivent être <strong>propres et bien tenus</strong>.</p>
            <p>Voici la liste des tâches à faire pendant les périodes creuses (plus de vélos ou pas de client) pour respecter cette consigne :</p>
            <ol class="proc-steps">
                <li><strong>Passer le balais</strong> à l'intérieur et à l'extérieur du magasin.</li>
                <li><strong>Arranger les boissons du frigo</strong> (plusieurs fois par jour).</li>
                <li><strong>Nettoyer l'espace flyer</strong> (plusieurs fois par jour).</li>
                <li><strong>Réassortir les flyers</strong> à l'intérieur et à l'extérieur.</li>
                <li>
                    <strong>Surveiller régulièrement les batteries :</strong>
                    <ol class="proc-substeps">
                        <li>Brancher les batteries déchargées (cf. guide gestion des batteries).</li>
                        <li>Débrancher les batteries pleines.</li>
                        <li>Apporter les batteries pleines dans l'étagère à batteries.</li>
                    </ol>
                </li>
                <li>
                    <strong>Nettoyer les vélos sales</strong> (plusieurs fois par jour) à l'aide d'une microfibre et du produit :
                    <ol class="proc-substeps">
                        <li>Gardes boues.</li>
                        <li>Fourche.</li>
                        <li>Cadre.</li>
                        <li>Jantes (AV et AR).</li>
                    </ol>
                </li>
            </ol>
        `
    },
    {
        id: 'gestion-batteries',
        title: 'Gestion des batteries',
        category: 'Périodes creuses & Batteries',
        emoji: '🔋',
        search: 'gestion batteries 4 types fine longue noire Naka noir charger après sortie bleu Naka bleu bosch SUNN blanc épaisse longue NCM noir moins 3 voyants tous soirs après 18h rectangulaire NCM beige moins 47 V tous soirs moins 50 V',
        body: `
            <p><strong>4 types de batteries :</strong></p>
            <table class="proc-table">
                <thead>
                    <tr>
                        <th>Batterie</th>
                        <th>Modèle</th>
                        <th>Règle de charge</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><strong>Fine et longue noire</strong></td><td>Naka noir</td><td>À charger après chaque sortie.</td></tr>
                    <tr><td><strong>Fine et longue bleue</strong></td><td>Naka bleu</td><td>À charger après chaque sortie.</td></tr>
                    <tr><td><strong>Bosch</strong></td><td>SUNN blanc</td><td>À charger après chaque sortie.</td></tr>
                    <tr><td><strong>Épaisse et longue noire</strong></td><td>NCM noir</td><td>À charger si moins de 3 voyants. À charger tous les soirs après 18h.</td></tr>
                    <tr><td><strong>Rectangulaire</strong></td><td>NCM beige</td><td>À charger si moins de 47 V. À charger tous les soirs si moins de 50 V.</td></tr>
                </tbody>
            </table>
            <div class="proc-warn">⚠️ Chaque modèle de VAE dispose d'une batterie spécifique : vérifier la correspondance avant de charger.</div>
        `
    },

    // ==================== 8. TARIFS ====================
    {
        id: 'tableau-marge-temps',
        title: 'Tableau marge temps',
        category: 'Tarifs & Réductions',
        emoji: '⏱️',
        search: 'tableau marge temps 2h à 2h20 prix 0 à 2h 2h20 à 2h30 10% total 4h à 4h20 4h20 à 4h30 prix 2 à 4h 6h à 6h20 6h20 à 6h30 prix 4 à 6h',
        body: `
            <table class="proc-table">
                <thead>
                    <tr>
                        <th>2h à 2h20</th>
                        <th>2h20 à 2h30</th>
                        <th>4h à 4h20</th>
                        <th>4h20 à 4h30</th>
                        <th>6h à 6h20</th>
                        <th>6h20 à 6h30</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Prix 0 à 2h</td>
                        <td>10% sur total</td>
                        <td>Prix 2 à 4h</td>
                        <td>10% sur total</td>
                        <td>Prix 4 à 6h</td>
                        <td>10% sur total</td>
                    </tr>
                </tbody>
            </table>
            <div class="proc-info">ℹ️ Une petite marge de dépassement est tolérée : appliquez le prix inférieur, ou -10% sur le total selon la colonne.</div>
        `
    },
    {
        id: 'tableau-tarifs-speciaux',
        title: 'Tableau tarifs spéciaux',
        category: 'Tarifs & Réductions',
        emoji: '🏷️',
        search: 'tableau tarifs spéciaux vélo route tandem demi-journée 0 à 4h 45 journée plus 4h 60',
        body: `
            <table class="proc-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>0 à 4h — Demi-journée</th>
                        <th>+ de 4h — Journée</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Vélo de route / Tandem</strong></td>
                        <td><strong>45 €</strong></td>
                        <td><strong>60 €</strong></td>
                    </tr>
                </tbody>
            </table>
        `
    },
    {
        id: 'reductions-probleme',
        title: 'Réductions en cas de problème',
        category: 'Tarifs & Réductions',
        emoji: '🎁',
        search: 'réductions problème mineur pas gênant vitesses passent mal moyen gênant utilisation possible selle bouge épuisant rapide batterie majeur très gênant dangereux dysfonctionnement frein grave utilisation impossible frein HS direction HS moins 5 10 30 40 50 gratuit',
        body: `
            <table class="proc-table">
                <thead>
                    <tr>
                        <th>Gravité</th>
                        <th>Exemples</th>
                        <th>Réduction</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Mineur</strong> (pas gênant pour le client)</td>
                        <td>Ex. vitesses passent mal</td>
                        <td><strong>- 5%</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Moyen</strong> (gênant mais utilisation possible)</td>
                        <td>Ex. selle bouge, épuisement rapide de la batterie</td>
                        <td><strong>- 10% à - 30%</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Majeur</strong> (très gênant, utilisation possible mais dangereuse)</td>
                        <td>Ex. dysfonctionnement d'un frein</td>
                        <td><strong>- 40% ou - 50%</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Grave</strong> (utilisation impossible)</td>
                        <td>Ex. frein HS ou direction HS</td>
                        <td><strong>Gratuit</strong></td>
                    </tr>
                </tbody>
            </table>
            <div class="proc-tip">💡 En cas de doute sur le niveau de réduction à appliquer, demandez l'avis d'un référent.</div>
        `
    }
];

// ============================================================
// HELPERS
// ============================================================

/** Retourne une procédure par son id */
function getProcedureById(id) {
    return PROCEDURES_DATA.find(p => p.id === id) || null;
}

/** Retourne toutes les catégories distinctes dans l'ordre */
function getProcedureCategories() {
    const cats = [];
    PROCEDURES_DATA.forEach(p => {
        if (!cats.includes(p.category)) cats.push(p.category);
    });
    return cats;
}