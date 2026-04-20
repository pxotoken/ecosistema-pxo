import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { ProductCard } from './ProductCard';
import { ProductDetailsModal } from './products/ProductDetailsModal';
import { IProduct } from '@pxo/shared/types';

const products: IProduct[] = [
  {
    title: "PXO Debt – 6% APY",
    description: "Invest in high-growth potential assets with significant returns, but also higher volatility.",
    riskLevel: "High",
    imageUrl: "/franklin-templeton.jpeg",
    features: [
      "Aggressive growth strategy",
      "Exposure to emerging markets",
      "Potential for substantial gains",
    ],
    subProducts: [
      {
        id: 'hrf-1',
        name: 'Global Tech Innovators',
        description: 'Invest in leading technology companies with high growth potential.',
        minInvestment: 1000,
        expectedReturn: '15-25%',
      },
      {
        id: 'hrf-2',
        name: 'Emerging Markets Equity',
        description: 'Exposure to rapidly growing economies with higher risk and reward.',
        minInvestment: 500,
        expectedReturn: '18-30%',
      },
    ],
  },
  {
    title: "PXO Variable Income – 15% APY",
    description: "A stable investment option focused on capital preservation and consistent, moderate returns.",
    riskLevel: "Low",
    imageUrl: "/franklin-templeton.jpeg",
    features: [
      "Capital preservation focus",
      "Diversified low-risk assets",
      "Steady, predictable returns",
    ],
    subProducts: [
      {
        id: 'cf-1',
        name: 'Government Bonds Portfolio',
        description: 'Low-risk investment in stable government-issued bonds.',
        minInvestment: 2000,
        expectedReturn: '3-5%',
      },
      {
        id: 'cf-2',
        name: 'Diversified Fixed Income',
        description: 'A mix of corporate and government bonds for steady returns.',
        minInvestment: 1500,
        expectedReturn: '4-6%',
      },
    ],
  },
  {
    title: "PXO Crypto – 20% APY",
    description: "Leverage artificial intelligence to identify market opportunities and optimize your portfolio.",
    riskLevel: "Medium",
    imageUrl: "/franklin-templeton.jpeg",
    features: [
      "AI-driven investment decisions",
      "Automated portfolio optimization",
      "Adaptive to market changes",
    ],
    subProducts: [
      {
        id: 'aif-1',
        name: 'AI-Powered Growth',
        description: 'Utilizes AI algorithms to identify high-growth stocks.',
        minInvestment: 1200,
        expectedReturn: '10-18%',
      },
      {
        id: 'aif-2',
        name: 'Machine Learning Quant',
        description: 'Advanced ML models for quantitative trading strategies.',
        minInvestment: 2500,
        expectedReturn: '12-20%',
      },
    ],
  },
];

export const ProductCarousel: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof products[0] | null>(null);

  const handleLearnMore = (category: typeof products[0]) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
    console.log("ProductCarousel: Opening modal with category:", category);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="relative py-8">
      <Swiper
        slidesPerView={1}
        spaceBetween={30}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        modules={[Pagination, Navigation]}
        className="mySwiper"
        breakpoints={{
          640: {
            slidesPerView: 1,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 2,
            spaceBetween: 40,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 50,
          },
        }}
      >
        {products.map((product, index) => (
          <SwiperSlide key={index} className="h-auto">
            <div className="h-full">
              <ProductCard {...product} onLearnMore={() => handleLearnMore(product)} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <ProductDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialCategory={selectedCategory}
        allCategories={products}
      />
    </div>
  );
};