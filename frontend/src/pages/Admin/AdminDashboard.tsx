import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-32 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: `₹${((analytics?.revenue?.totalRevenue || 0) / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total Orders',
      value: analytics?.revenue?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Total Products',
      value: analytics?.totalProducts || 0,
      icon: Package,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link to="/admin/products" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Manage Products</h3>
              <p className="text-gray-600">Add, edit, or remove products</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/orders" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Manage Orders</h3>
              <p className="text-gray-600">View and update order status</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Top Products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Top Products</h2>
          <div className="space-y-3">
            {analytics.topProducts.map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-600">
                    {product.totalQuantity} units sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">
                    ₹{(product.totalRevenue / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Breakdown */}
      {analytics?.orderStatusBreakdown && analytics.orderStatusBreakdown.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-bold mb-4">Order Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.orderStatusBreakdown.map((status: any) => (
              <div key={status._id} className="text-center p-4 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-primary-600">{status.count}</p>
                <p className="text-sm text-gray-600 capitalize">{status._id}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
