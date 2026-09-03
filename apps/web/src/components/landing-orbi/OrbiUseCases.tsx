import React from 'react';
import { PlusIcon, ArrowUpRightIcon, SendIcon, ReceiveIcon } from './icons';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

interface UseCase {
  key: string;
  iconClass: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}

const UseCaseCard: React.FC<{ useCase: UseCase }> = ({ useCase }) => (
  <div className="uc-card">
    <div className={`uc-icon-wrap ${useCase.iconClass}`}>{useCase.icon}</div>
    <div className="uc-content">
      <div className="uc-title">{useCase.title}</div>
      <div className="uc-sub">{useCase.sub}</div>
    </div>
    <div className="uc-tokens">
      <div className="uc-token-badge pxo-badge">
        <img src="/pxo-coin.png" alt="PXO" />
        PXO
      </div>
      <div className="uc-token-badge usdt-badge">USDT</div>
      <div className="uc-token-badge usdc-badge">USDC</div>
    </div>
  </div>
);

export const OrbiUseCases: React.FC = () => {
  const { useCases } = useMessages();

  const cards: UseCase[] = [
    {
      key: 'buy',
      iconClass: 'uc-buy',
      icon: <PlusIcon size={22} />,
      title: useCases.buy.title,
      sub: useCases.buy.sub,
    },
    {
      key: 'sell',
      iconClass: 'uc-sell',
      icon: <ArrowUpRightIcon size={22} />,
      title: useCases.sell.title,
      sub: useCases.sell.sub,
    },
    {
      key: 'send',
      iconClass: 'uc-send',
      icon: <SendIcon size={22} />,
      title: useCases.send.title,
      sub: useCases.send.sub,
    },
    {
      key: 'receive',
      iconClass: 'uc-receive',
      icon: <ReceiveIcon size={22} />,
      title: useCases.receive.title,
      sub: useCases.receive.sub,
    },
  ];

  const tokensCard = (
    <div className="uc-card uc-stable-card">
      <div className="uc-stable-title">{useCases.supportedTokens}</div>
      <div className="uc-stable-coins">
        <div className="uc-stable-coin pxo-big">
          <img src="/pxo-coin.png" alt="PXO" />
          <span>PXO</span>
          <small>{useCases.pxoCaption}</small>
        </div>
        <div className="uc-stable-coin usdt-big">
          <span className="coin-letter coin-usdt">₮</span>
          <span>USDT</span>
          <small>{useCases.usdtCaption}</small>
        </div>
        <div className="uc-stable-coin usdc-big">
          <span className="coin-letter coin-usdc">$</span>
          <span>USDC</span>
          <small>{useCases.usdcCaption}</small>
        </div>
      </div>
    </div>
  );

  return (
    <div className="what-we-do" id={SECTIONS.useCases}>
      <div className="what-we-do-inner">
        <p className="what-label">{useCases.label}</p>
        <div className="carousel-wrap">
          {/* The track is rendered twice so the marquee loops seamlessly. */}
          <div className="carousel-track use-case-track">
            {[0, 1].map((copy) => (
              <React.Fragment key={copy}>
                {cards.map((useCase) => (
                  <UseCaseCard key={`${copy}-${useCase.key}`} useCase={useCase} />
                ))}
                {tokensCard}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
