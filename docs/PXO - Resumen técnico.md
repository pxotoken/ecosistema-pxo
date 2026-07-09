# Resumen técnico

## Características del token

Estándar de token: $PXO se construye siguiendo el estándar de token ERC-20. Este estándar garantiza compatibilidad con diversas carteras y exchanges, ofreciendo a los usuarios una experiencia familiar y segura. El marco técnico consiste en contratos inteligentes que gestionan las funcionalidades de acuñación, quema y pausa, garantizando el cumplimiento y la integridad operativa.

$PXO es inicialmente una "bifurcación" del repositorio fuente de contratos inteligentes utilizado por las stablecoins de Circle en blockchains compatibles con EVM.

Redes soportadas: $PXO está disponible de forma nativa en Arbitrum y Ethereum, ambas redes sin permisos. $PXO sobre Arbitrum aprovecha las velocidades de transacción más rápidas de la red y las menores comisiones para escalar, mientras está posicionado para escalar, ya que la red soporta altos volúmenes de transacciones (\~40.000 TPS). Debido a su alto nivel de seguridad y descentralización, $PXO en Ethereum también es una opción para constructores y empresas.

## Contratos

* FiatTokenV2\_2 Contrato Inteligente: Este contrato gestiona las funcionalidades principales sin almacenar datos críticos como nombres de tokens o símbolos, que se mantienen en el contrato proxy. Permite la creación y destrucción de tokens por roles designados y soporta mejoras y correcciones mediante un estándar proxy.

* Contrato Inteligente Proxy de FiatToken: Actúa como intermediario, reteniendo información esencial y permitiendo la actualización del contrato. Contiene los detalles del FiatToken y facilita la transición a nuevas implementaciones de contratos.

  La seguridad y la prevención del fraude son fundamentales en la arquitectura de $PXO. Estos son los mecanismos en marcha:

* Biblioteca SignatureChecker: Este componente garantiza la autenticidad de las transacciones verificando las firmas en el contrato FiatTokenV2\_2. Verifica tanto las firmas ECDSA como ERC1271, que son protocolos estándar para autenticar transacciones en la blockchain de Ethereum.

* Control de Acceso Basado en Roles: El FiatTokenV2\_2 Smart Contract define roles específicos con capacidades distintas, tales como:

  * MasterMinter: añade y elimina los minters y aumenta su franquicia de acuñación.

  * Injetivos: crear y destruir fichas.

  * Pausa: pausa el contrato, que impide todas las transferencias, acuñación y quemaduras.

  * Blacklister: impide todas las transferencias hacia o desde una dirección concreta, y evita que esa dirección se acuñe o queme.

  * Propietario: reasigna cualquiera de los roles excepto administrativo.

  * Rescatador: transfiere cualquier token ERC-20 que esté bloqueado en el contrato.

  El Contrato FiatTokenProxy sirve como capa administrativa para la stablecoin $PXO, asignando una función específica:

* Administrador: Gestiona funcionalidades a nivel de proxy, como actualizar el contrato de implementación , y es el remitente predeterminado del mensaje (dirección del desplegador). El administrador puede cambiar la dirección de administrador o ejecutar transacciones desde una dirección alternativa. Las llamadas directas al método por parte del administrador al proxy no se envían al contrato de implementación.

  Características de FiatToken: El FiatToken ofrece varias funcionalidades, que se describen brevemente a continuación. Hay documentos de diseño más detallados en el directorio de documentos en el Github de $PXO. Entre ellos, se encuentran:

* Compatible con ERC20: El FiatToken implementa la interfaz ERC20.

* Pausable: Todo el contrato puede congelarse en caso de que se encuentre un error grave o haya una grave interrupción de la clave. No se pueden realizar transferencias mientras el contrato esté en pausa. La dirección de pausa controla el acceso a la funcionalidad de pausa.

* Actualizable: Se puede desplegar un nuevo contrato de implementación, y el contrato proxy reenviará las llamadas al nuevo contrato. El acceso a la funcionalidad de actualización está protegido por una dirección proxy Owner. Solo la dirección del proxy Owner puede modificar cuál dirección es el proxy Owner.  
* Lista negra: El contrato puede poner en lista negra ciertas direcciones que impedirán que esas direcciones transfieran o reciban tokens. La dirección del blacklister controla el acceso a la funcionalidad de blacklist.

* Acuñación/Quema: Las fichas pueden acuñarse o quemarse bajo demanda. El contrato permite tener varios maquinadores simultáneamente. Hay una dirección masterMinter que controla la lista de máquinas de acuñar y cuánto se puede acuñar cada una. La asignación de ceca es similar a la de ERC20: a medida que cada moneda acuña nuevas fichas, su asignación disminuye. Cuando se vuelva demasiado bajo, necesitarán que el masterMinter aumente de nuevo la asignación.

* Propietario: El contrato tiene un Propietario, que puede cambiar las direcciones del propietario, pausador, blacklister o masterMinter. El propietario no puede cambiar la dirección del proxy Owner.

  A través de estas medidas, $PXO garantiza que la tecnología subyacente no solo respalde el funcionamiento estable del token, sino que también proteja contra accesos no autorizados, posibles brechas y actividades fraudulentas. Los contratos inteligentes de $PXO han sido auditados y serán auditados continuamente para asegurar que cualquier actualización realizada en los contratos del token no afecte a su seguridad.

