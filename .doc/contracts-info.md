# Contrats Logic Details

## Gamma Packs / Gamma Cards

- 5000 copias de cada carta (120 personajes únicos) = 600.000 cartas de personajes
- se venden de a sobres a ciegas, trae 12 cartas y puede o no traer un album extra aleatoriamente
- los albumes de 120 figuritas son de toda la colección (los 120 personajes) (#120)
- los albumes de 60 figuritas son albumes de quema y no importa la figurita que pongan (#121)
- la carta al pegarse en el album se quema
- en total van a haber 3000 albumes de 120 figuritas, 5000 albumes de 60 figuritas, 
- 6000 figuritas, 600000 cartas en total, 50000 sobres.
- el album completo de 120 paga 15 dolares
- el album completo de 60 paga 1 dolar
- el sobre sale 1,20 dolares
- pago total por albumes completos 49000
- total profit bruto si se venden todos los sobres 60000
- el ticket del album de un dolar da entrada para un jackpot que reparte 1000 dolares al final de la temporada
- total profit neto si se venden todos los sobres y se completan todos los albumes 10000 menos gastos de gas
- importante de la implementación que los albumes estén uniformemente repartidos en los sobres a lo largo del tiempo
- fee de transacción del 2.5%

## Gamma Offers

El contrato de ofertas permite gestionar el intercambio de cartas entre usuarios. Se puede:

* Crear ofertas: un usuario publica una carta que tiene en su poder con una listas de cartas, de las cuales 1 recibirá a cambio.

- Eliminar ofertas: Un usuario puede eliminar la oferta que publicó.

* Ver las ofertas publicadas.

- Realizar el intercambio de cartas 1 a 1, entre dos usuarios.


__condiciones__:

* Existe un número máximo de ofertas que se pueden crear, en total y por usuario. Ambos datos configurables en el contrato. Valores por defecto:
  - máximas ofertas por usuario: 5
  - máximas ofertas para todos los usuarios: 5000

- Al crear una oferta, la carta que tiene el usuario se saca de su inventario.  Al eliminar una oferta, se restaura.
* No se puede requerir un carta (wantedCards) igual a la que se está ofertando.
- Solo se puede ofertar una carta que se tiene.
* Un usuario puede eliminar la publicación de una oferta, acción que le restaurará su carta al inventario.

