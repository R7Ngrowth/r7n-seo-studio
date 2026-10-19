<?php
/**
 * Plugin Name:       R7N Blog
 * Description:       Nette, vaste opmaak voor je blogs: kop met afbeelding, inhoudsopgave, actieblokken, tips, uitklapbare veelgestelde vragen en schema voor Google. Hoort bij R7N SEO Studio.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            R7N Growth
 * License:           R7N-licentie (zie LICENSE.md)
 * Text Domain:       r7n-blog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'R7N_BLOG_VERSIE', '1.0.0' );

/* ============================================================ instellingen */

function r7n_blog_standaard(): array {
	return array(
		'modus'        => 'auto', // auto | volledig | inhoud
		'accent'       => '#ff6a1a',
		'donker'       => '#111418',
		'reacties_uit' => 1,
		'team_titel'   => 'Over ons',
		'team_tekst'   => '',
		'team_link'    => '',
		'cta'          => array(
			'advies'   => array( 'Hulp bij kiezen', 'Twijfel je wat het beste bij je past?', 'Wij helpen je graag met persoonlijk advies.', 'Vraag advies', '' ),
			'afspraak' => array( 'Afspraak', 'Kom langs en ervaar het zelf', 'Plan een afspraak op een moment dat jou uitkomt.', 'Plan een afspraak', '' ),
			'service'  => array( 'Service', 'Laat het door een specialist doen', 'Onderhoud, reparatie of controle: wij regelen het.', 'Plan service', '' ),
			'contact'  => array( 'Contact', 'Vragen? Neem contact op', 'We reageren snel en denken graag met je mee.', 'Neem contact op', '' ),
		),
	);
}

function r7n_blog_opties(): array {
	$o = get_option( 'r7n_blog', array() );
	$s = r7n_blog_standaard();
	$o = is_array( $o ) ? $o : array();
	$o = array_merge( $s, $o );
	foreach ( $s['cta'] as $k => $v ) {
		$o['cta'][ $k ] = isset( $o['cta'][ $k ] ) && is_array( $o['cta'][ $k ] ) ? array_replace( $v, $o['cta'][ $k ] ) : $v;
	}
	return $o;
}

// Volledige pagina alleen bij klassieke thema's; bij blokthema's verbeteren we alleen de inhoud.
function r7n_blog_volledig(): bool {
	$m = r7n_blog_opties()['modus'];
	if ( 'volledig' === $m ) {
		return true;
	}
	if ( 'inhoud' === $m ) {
		return false;
	}
	return ! ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() );
}

function r7n_blog_hier(): bool {
	return ! is_admin() && is_singular( 'post' );
}

/* ============================================================ bouwstenen */

function r7n_blog_cta_html( string $type ): string {
	$o = r7n_blog_opties();
	$c = $o['cta'][ $type ] ?? $o['cta']['contact'];
	list( $label, $titel, $tekst, $knop, $url ) = array_pad( $c, 5, '' );
	$url = $url ? $url : home_url( '/contact/' );
	return sprintf(
		'<aside class="r7n-cta r7n-cta--%1$s"><div class="r7n-cta__tekst"><p class="r7n-cta__label">%2$s</p><p class="r7n-cta__titel">%3$s</p><p class="r7n-cta__p">%4$s</p></div><a class="r7n-knop" href="%5$s">%6$s <span aria-hidden="true">&rarr;</span></a></aside>',
		esc_attr( $type ),
		esc_html( $label ),
		esc_html( $titel ),
		esc_html( $tekst ),
		esc_url( $url ),
		esc_html( $knop )
	);
}

add_shortcode(
	'r7n_cta',
	function ( $a ) {
		$a = shortcode_atts( array( 'type' => 'contact' ), (array) $a );
		return r7n_blog_cta_html( sanitize_key( $a['type'] ) );
	}
);

add_shortcode(
	'r7n_tip',
	function ( $a, $inhoud = null ) {
		$a = shortcode_atts( array( 'titel' => 'Tip' ), (array) $a );
		return '<div class="r7n-tip"><p class="r7n-tip__titel">' . esc_html( $a['titel'] ) . '</p><div class="r7n-tip__tekst">' . wp_kses_post( wpautop( trim( (string) $inhoud ) ) ) . '</div></div>';
	}
);

/* ============================================================ inhoud verbeteren */

/**
 * Bewerkt de bloginhoud: ids op H2's (inhoudsopgave), FAQ-sectie als uitklapper, bouwstenen los van alinea's.
 * Geeft [html, inhoudsopgave, faq] terug.
 */
function r7n_blog_bewerk( string $html ): array {
	// Bouwstenen die toch in een alinea staan eruit halen.
	$html = preg_replace( '#<p>\s*(\[r7n_[^\]]*\](?:.*?\[/r7n_\w+\])?)\s*</p>#s', '$1', $html );
	$html = do_shortcode( $html );
	$toc  = array();
	$faq  = array();
	$ids  = array();

	if ( preg_match( '#<h2[^>]*>([^<]*vragen[^<]*|[^<]*questions[^<]*|[^<]*FAQ[^<]*)</h2>(.*?)(?=<h2|\z)#is', $html, $m ) ) {
		if ( preg_match_all( '#<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|\z)#is', $m[2], $qs, PREG_SET_ORDER ) && count( $qs ) >= 2 ) {
			$lijst = '';
			foreach ( $qs as $q ) {
				$vraag  = trim( wp_strip_all_tags( $q[1] ) );
				$faq[]  = array( $vraag, trim( wp_strip_all_tags( $q[2] ) ) );
				$lijst .= '<details class="r7n-faq__item"><summary>' . esc_html( $vraag ) . '</summary><div class="r7n-faq__antwoord">' . trim( $q[2] ) . '</div></details>';
			}
			$html = str_replace( $m[0], '<h2>' . $m[1] . '</h2><div class="r7n-faq">' . $lijst . '</div>', $html );
		}
	}

	$html = preg_replace_callback(
		'#<h2([^>]*)>(.*?)</h2>#is',
		function ( $m ) use ( &$toc, &$ids ) {
			$basis = sanitize_title( wp_strip_all_tags( $m[2] ) );
			$basis = $basis ? $basis : 'sectie';
			$id    = $basis;
			for ( $i = 2; isset( $ids[ $id ] ); $i++ ) {
				$id = $basis . '-' . $i;
			}
			$ids[ $id ] = true;
			$toc[]      = array( $id, trim( wp_strip_all_tags( $m[2] ) ) );
			return '<h2 id="' . esc_attr( $id ) . '"' . preg_replace( '#\sid="[^"]*"#', '', $m[1] ) . '>' . $m[2] . '</h2>';
		},
		$html
	);

	// Geen actieblok in de tekst? Dan één halverwege (na de derde H2), anders aan het eind.
	if ( false === strpos( $html, 'r7n-cta' ) ) {
		$delen = preg_split( '#(?=<h2)#i', $html );
		$cta   = r7n_blog_cta_html( 'contact' );
		if ( count( $delen ) >= 4 ) {
			array_splice( $delen, 3, 0, $cta );
			$html = implode( '', $delen );
		} else {
			$html .= $cta;
		}
	}
	return array( $html, $toc, $faq );
}

function r7n_blog_toc_html( array $toc ): string {
	if ( count( $toc ) < 3 ) {
		return '';
	}
	$items = '';
	foreach ( $toc as $t ) {
		$items .= '<li><a href="#' . esc_attr( $t[0] ) . '">' . esc_html( $t[1] ) . '</a></li>';
	}
	return '<nav class="r7n-toc" aria-label="Inhoudsopgave"><details open><summary>In dit artikel</summary><ol>' . $items . '</ol></details></nav>';
}

function r7n_blog_team_html(): string {
	$o = r7n_blog_opties();
	if ( ! trim( $o['team_tekst'] ) ) {
		return '';
	}
	$link = $o['team_link'] ? '<a class="r7n-link" href="' . esc_url( $o['team_link'] ) . '">Meer over ons</a>' : '';
	return '<section class="r7n-team"><p class="r7n-team__titel">' . esc_html( $o['team_titel'] ) . '</p><p>' . esc_html( $o['team_tekst'] ) . '</p>' . $link . '</section>';
}

function r7n_blog_schema( WP_Post $p, array $faq ): string {
	$data = array(
		'@context'         => 'https://schema.org',
		'@type'            => 'BlogPosting',
		'headline'         => get_the_title( $p ),
		'datePublished'    => get_the_date( 'c', $p ),
		'dateModified'     => get_the_modified_date( 'c', $p ),
		'author'           => array( '@type' => 'Organization', 'name' => get_bloginfo( 'name' ) ),
		'publisher'        => array( '@type' => 'Organization', 'name' => get_bloginfo( 'name' ) ),
		'mainEntityOfPage' => get_permalink( $p ),
	);
	$img = get_the_post_thumbnail_url( $p, 'large' );
	if ( $img ) {
		$data['image'] = $img;
	}
	$out = '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
	if ( $faq ) {
		$vragen = array();
		foreach ( $faq as $q ) {
			$vragen[] = array( '@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $q[1] ) );
		}
		$out .= '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $vragen ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
	}
	return $out;
}

/* ============================================================ weergave */

// Modus "inhoud" (werkt met elk thema): het thema toont kop en afbeelding; wij verbeteren de tekst eronder.
add_filter(
	'the_content',
	function ( $inhoud ) {
		if ( ! r7n_blog_hier() || r7n_blog_volledig() || ! in_the_loop() || ! is_main_query() ) {
			return $inhoud;
		}
		list( $html, $toc, $faq ) = r7n_blog_bewerk( $inhoud );
		return '<div class="r7n-blog r7n-blog--inhoud">' . r7n_blog_toc_html( $toc ) . '<div class="r7n-inhoud">' . $html . '</div>' . r7n_blog_team_html() . '</div>' . r7n_blog_schema( get_post(), $faq );
	},
	20
);

// Modus "volledig" (klassieke thema's): eigen blogpagina tussen de kop en voet van het thema.
add_action(
	'template_redirect',
	function () {
		if ( ! r7n_blog_hier() || ! r7n_blog_volledig() || post_password_required() ) {
			return;
		}
		$p = get_queried_object();
		if ( ! $p instanceof WP_Post ) {
			return;
		}
		$ruw = apply_filters( 'r7n_blog_ruwe_inhoud', wpautop( do_blocks( $p->post_content ) ) );
		list( $html, $toc, $faq ) = r7n_blog_bewerk( $ruw );
		$cat   = get_the_category( $p->ID );
		$cat   = $cat ? $cat[0] : null;
		$woord = str_word_count( wp_strip_all_tags( $p->post_content ) );
		get_header();
		?>
		<main id="r7n-blog" class="r7n-blog r7n-blog--volledig">
			<header class="r7n-kop">
				<div class="r7n-kop__wrap">
					<div>
						<?php if ( $cat && 'uncategorized' !== $cat->slug ) : ?>
							<a class="r7n-kop__cat" href="<?php echo esc_url( get_category_link( $cat ) ); ?>"><?php echo esc_html( $cat->name ); ?></a>
						<?php endif; ?>
						<h1 class="r7n-kop__titel"><?php echo esc_html( get_the_title( $p ) ); ?></h1>
						<?php if ( has_excerpt( $p ) ) : ?>
							<p class="r7n-kop__intro"><?php echo esc_html( get_the_excerpt( $p ) ); ?></p>
						<?php endif; ?>
						<p class="r7n-kop__meta"><?php echo esc_html( get_the_date( '', $p ) ); ?> &middot; <?php echo (int) max( 1, round( $woord / 220 ) ); ?> min lezen</p>
					</div>
					<?php if ( has_post_thumbnail( $p ) ) : ?>
						<figure class="r7n-kop__beeld"><?php echo get_the_post_thumbnail( $p, 'large', array( 'loading' => 'eager' ) ); ?></figure>
					<?php endif; ?>
				</div>
			</header>
			<div class="r7n-lijf">
				<?php echo r7n_blog_toc_html( $toc ); // phpcs:ignore ?>
				<article class="r7n-artikel">
					<div class="r7n-inhoud"><?php echo $html; // phpcs:ignore ?></div>
					<?php echo r7n_blog_team_html(); // phpcs:ignore ?>
				</article>
			</div>
		</main>
		<?php
		echo r7n_blog_schema( $p, $faq ); // phpcs:ignore
		get_footer();
		exit;
	},
	20
);

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! r7n_blog_hier() ) {
			return;
		}
		wp_enqueue_style( 'r7n-blog', plugins_url( 'assets/r7n-blog.css', __FILE__ ), array(), R7N_BLOG_VERSIE );
		$o = r7n_blog_opties();
		wp_add_inline_style( 'r7n-blog', sprintf( ':root{--r7n-accent:%s;--r7n-donker:%s;}', sanitize_hex_color( $o['accent'] ) ?: '#ff6a1a', sanitize_hex_color( $o['donker'] ) ?: '#111418' ) );
	}
);

add_filter( 'body_class', fn( $c ) => r7n_blog_hier() ? array_merge( $c, array( 'r7n-blog-pagina' ) ) : $c );
add_filter( 'comments_open', fn( $open, $id ) => ( r7n_blog_opties()['reacties_uit'] && 'post' === get_post_type( $id ) ) ? false : $open, 10, 2 );

/* ============================================================ beheerpagina */

add_action(
	'admin_menu',
	function () {
		add_options_page( 'R7N Blog', 'R7N Blog', 'manage_options', 'r7n-blog', 'r7n_blog_beheer' );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting(
			'r7n_blog',
			'r7n_blog',
			array(
				'type'              => 'array',
				'sanitize_callback' => function ( $in ) {
					$s   = r7n_blog_standaard();
					$in  = is_array( $in ) ? $in : array();
					$uit = array(
						'modus'        => in_array( $in['modus'] ?? '', array( 'auto', 'volledig', 'inhoud' ), true ) ? $in['modus'] : 'auto',
						'accent'       => sanitize_hex_color( $in['accent'] ?? '' ) ?: $s['accent'],
						'donker'       => sanitize_hex_color( $in['donker'] ?? '' ) ?: $s['donker'],
						'reacties_uit' => empty( $in['reacties_uit'] ) ? 0 : 1,
						'team_titel'   => sanitize_text_field( $in['team_titel'] ?? '' ),
						'team_tekst'   => sanitize_textarea_field( $in['team_tekst'] ?? '' ),
						'team_link'    => esc_url_raw( $in['team_link'] ?? '' ),
						'cta'          => array(),
					);
					foreach ( $s['cta'] as $k => $v ) {
						$c = $in['cta'][ $k ] ?? array();
						$uit['cta'][ $k ] = array(
							sanitize_text_field( $c[0] ?? $v[0] ),
							sanitize_text_field( $c[1] ?? $v[1] ),
							sanitize_textarea_field( $c[2] ?? $v[2] ),
							sanitize_text_field( $c[3] ?? $v[3] ),
							esc_url_raw( $c[4] ?? '' ),
						);
					}
					return $uit;
				},
			)
		);
	}
);

function r7n_blog_beheer() {
	$o     = r7n_blog_opties();
	$namen = array( 'advies' => 'Advies of keuzehulp', 'afspraak' => 'Afspraak of proefrit', 'service' => 'Service of onderhoud', 'contact' => 'Contact of offerte' );
	?>
	<div class="wrap">
		<h1>R7N Blog</h1>
		<p>Opmaak voor je blogs uit R7N SEO Studio. Wijzigingen gelden meteen voor al je blogs.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'r7n_blog' ); ?>
			<h2>Algemeen</h2>
			<table class="form-table">
				<tr><th>Opmaak</th><td>
					<select name="r7n_blog[modus]">
						<option value="auto" <?php selected( $o['modus'], 'auto' ); ?>>Automatisch (aangeraden)</option>
						<option value="volledig" <?php selected( $o['modus'], 'volledig' ); ?>>Volledige blogpagina (klassieke thema's)</option>
						<option value="inhoud" <?php selected( $o['modus'], 'inhoud' ); ?>>Alleen de inhoud verbeteren (werkt met elk thema)</option>
					</select>
					<p class="description">Ziet je blog er dubbel of vreemd uit? Kies "Alleen de inhoud verbeteren".</p>
				</td></tr>
				<tr><th>Accentkleur</th><td><input type="color" name="r7n_blog[accent]" value="<?php echo esc_attr( $o['accent'] ); ?>"> <span class="description">Knoppen, lijnen en markeringen.</span></td></tr>
				<tr><th>Donkere kleur</th><td><input type="color" name="r7n_blog[donker]" value="<?php echo esc_attr( $o['donker'] ); ?>"> <span class="description">Kop en actieblokken.</span></td></tr>
				<tr><th>Reacties</th><td><label><input type="checkbox" name="r7n_blog[reacties_uit]" value="1" <?php checked( $o['reacties_uit'], 1 ); ?>> Reacties onder blogs uitzetten</label></td></tr>
			</table>
			<h2>Actieblokken</h2>
			<p>De SEO Studio zet een van deze blokken in elke blog. Vul per blok de link in naar de juiste pagina.</p>
			<table class="form-table">
				<?php foreach ( $namen as $k => $naam ) : $c = $o['cta'][ $k ]; ?>
					<tr><th><?php echo esc_html( $naam ); ?></th><td>
						<input class="regular-text" name="r7n_blog[cta][<?php echo esc_attr( $k ); ?>][0]" value="<?php echo esc_attr( $c[0] ); ?>" placeholder="Label"><br>
						<input class="regular-text" name="r7n_blog[cta][<?php echo esc_attr( $k ); ?>][1]" value="<?php echo esc_attr( $c[1] ); ?>" placeholder="Titel"><br>
						<textarea class="large-text" rows="2" name="r7n_blog[cta][<?php echo esc_attr( $k ); ?>][2]" placeholder="Tekst"><?php echo esc_textarea( $c[2] ); ?></textarea><br>
						<input class="regular-text" name="r7n_blog[cta][<?php echo esc_attr( $k ); ?>][3]" value="<?php echo esc_attr( $c[3] ); ?>" placeholder="Knoptekst">
						<input class="regular-text" name="r7n_blog[cta][<?php echo esc_attr( $k ); ?>][4]" value="<?php echo esc_attr( $c[4] ); ?>" placeholder="https://… (link van de knop)">
					</td></tr>
				<?php endforeach; ?>
			</table>
			<h2>Over ons (onder elke blog)</h2>
			<table class="form-table">
				<tr><th>Titel</th><td><input class="regular-text" name="r7n_blog[team_titel]" value="<?php echo esc_attr( $o['team_titel'] ); ?>"></td></tr>
				<tr><th>Tekst</th><td><textarea class="large-text" rows="3" name="r7n_blog[team_tekst]" placeholder="Leeg = blok niet tonen"><?php echo esc_textarea( $o['team_tekst'] ); ?></textarea></td></tr>
				<tr><th>Link</th><td><input class="regular-text" name="r7n_blog[team_link]" value="<?php echo esc_attr( $o['team_link'] ); ?>" placeholder="https://…/over-ons/"></td></tr>
			</table>
			<?php submit_button( 'Opslaan' ); ?>
		</form>
	</div>
	<?php
}
