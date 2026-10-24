#!/usr/bin/perl
# Servidor estático mínimo para probar la web en local (solo desarrollo)
use strict;
use warnings;
use IO::Socket::IP;
use IO::Socket;
use File::Spec;

my $raiz = $ARGV[0] || '.';
my $puerto = $ARGV[1] || 8765;

my $srv = IO::Socket::INET->new(
    LocalAddr => '127.0.0.1',
    LocalPort => $puerto,
    Proto     => 'tcp',
    Listen    => 20,
    ReuseAddr => 1,
) or die "No se pudo abrir el puerto $puerto: $!\n";

print "Sirviendo $raiz en http://127.0.0.1:$puerto\n";
$| = 1;

my %tipos = (
    html => 'text/html; charset=UTF-8',
    css  => 'text/css; charset=UTF-8',
    js   => 'application/javascript; charset=UTF-8',
    png  => 'image/png',
    jpg  => 'image/jpeg',
    jpeg => 'image/jpeg',
    svg  => 'image/svg+xml',
    webp => 'image/webp',
    ico  => 'image/x-icon',
    json => 'application/json; charset=UTF-8',
    woff2 => 'font/woff2',
    woff  => 'font/woff',
    ttf   => 'font/ttf',
    mp4   => 'video/mp4',
    webm  => 'video/webm',
);

while (my $cli = $srv->accept) {
    my $peticion = <$cli>;
    next unless defined $peticion;
    while (my $l = <$cli>) { last if $l =~ /^\r?\n$/; }

    if ($peticion =~ m{^GET\s+(\S+)} ) {
        my $ruta = $1;
        $ruta =~ s/\?.*$//;
        $ruta =~ s/#.*$//;
        $ruta = '/index.html' if $ruta =~ m{/$};
        $ruta =~ s{^/}{};
        $ruta =~ s{/\\}{/}g;
        $ruta =~ s{\.\.}{}g;  # sin saltos de directorio

        my ($volumen, $dirs, $archivo) = File::Spec->splitpath($ruta);
        my ($ext) = $archivo =~ /\.([a-zA-Z0-9]+)$/;

        # URLs limpias: /catalogo -> /catalogo.html (igual que el .htaccess en producción)
        if ($ruta !~ /\.[a-zA-Z0-9]+$/ && !-f File::Spec->catfile($raiz, $ruta)) {
            my $con_html = "$ruta.html";
            $ruta = $con_html if -f File::Spec->catfile($raiz, $con_html);
        }

        if (open my $fh, '<:raw', File::Spec->catfile($raiz, $ruta)) {
            local $/;
            my $datos = <$fh>;
            close $fh;
            my $tipo = $tipos{lc($ext || '')} || 'application/octet-stream';
            print $cli "HTTP/1.1 200 OK\r\nContent-Type: $tipo\r\nContent-Length: " . length($datos) . "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
            print $cli $datos;
        } else {
            my $msg = "404 No encontrado: $ruta";
            print $cli "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Length: " . length($msg) . "\r\nConnection: close\r\n\r\n$msg";
        }
    }
    close $cli;
}
