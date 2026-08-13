'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  ClipboardList,
  CalendarDays,
  Gem,
  Heart,
  LayoutDashboard,
  Layers3,
  LogOut,
  Mail,
  Images,
  MessageCircle,
  Package2,
  Search,
  Settings,
  Smartphone,
  ShieldCheck,
  ShoppingBag,
  Tags,
  TicketPercent,
  UserCog,
  UsersRound,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getOrders,
  getProducts,
  saveProduct,
  removeProduct,
  money,
  updateOrderStatus,
  getCategories,
  saveCategory,
  removeCategory,
} from '@/lib/store';
import {
  getBridalPackages, saveBridalPackage, removeBridalPackage, BridalPackage
} from '@/lib/bridal';
import {
  getBookings, 
  removeBooking,
  updateBookingStatus,
  Booking,
} from '@/lib/bookings';
import {
  getBridalGalleryImages, addBridalGalleryImage, removeBridalGalleryImage, GalleryImage
} from '@/lib/gallery';
import {
  getTransformations, saveTransformation, removeTransformation, Transformation
} from '@/lib/transformations';
import {
  getTestimonials, saveTestimonial, removeTestimonial, Testimonial
} from '@/lib/testimonials';
import { getCoupons, saveCoupon, removeCoupon, Coupon } from '@/lib/coupons';
import { getCheckoutSettings, saveCheckoutSettings } from '@/lib/settings';
import { Product, Order, Category } from '@/lib/types';
import type { ProductReview } from '@/lib/productReviews';
import { showToast } from '@/lib/toast';
import { recordAdminActivity } from '@/lib/adminActivityClient';
import { uploadCatalogImage } from '@/lib/catalogImages';
import AdminPagination from '@/components/admin/AdminPagination';


type AdminOrder = Omit<Order, 'items'> & {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  customerAddress?: string;
  address?: string;
  deliveryDays?: string;
  deliveryDaysText?: string;
  estimatedDeliveryDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  createdAt?: string;
  status?: string;
  confirmationEmailStatus?: string;
  confirmationEmailError?: string | null;
  paymentEmailStatus?: string;
  paymentEmailError?: string | null;
  statusEmailStatus?: string;
  statusEmailError?: string | null;
  statusEmailLastStatus?: string;
  lastEmailType?: string;
  lastEmailStatus?: string;
  lastEmailSentAt?: string;
  lastEmailDeliveryStatus?: string;
  lastEmailProviderEvent?: string;
  lastEmailProviderEventAt?: string;
  items?: Array<{
    id?: string;
    name?: string;
    category?: string;
    price?: number;
    qty?: number;
    quantity?: number;
    image?: string;
    description?: string;
    stock?: number;
  }>;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  orders: AdminOrder[];
};

const blankProduct: Product = {
  id: '',
  name: '',
  price: 0,
  category: 'Hair Extensions & Wigs',
  type: 'product',
  description: '',
  image: '',
  stock: 1,
  sizes: [],
  featured: false,
  active: true,
};

const PRODUCT_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

const blankCategory: Category = {
  id: '',
  name: '',
  type: 'product',
  image: '',
  description: '',
  active: true,
};

const blankBridalPackage: BridalPackage = {
  id: '',
  name: '',
  price: 0,
  features: [],
  featured: false,
  popular: false,
  image: '',
  description: '',
};

const transformationCategories = [
  'Wig Installation', 'Wig Revamp', 'Wig Styling', 'Dreadlock Making',
  'Dreadlock Relocking', 'Bridal Makeup', 'Event Makeup', 'Gele Styling', 'Pedicure'
];

const blankTransformation: Omit<Transformation, 'createdAt'> = {
  id: '',
  title: '',
  category: transformationCategories[0],
  beforeImage: '',
  afterImage: '',
  description: '',
  featured: false,
};

type TransformationFormState = {
  data: Omit<Transformation, 'createdAt'>;
  beforeImageFile: string | null;
  afterImageFile: string | null;
};

const blankTransformationForm: TransformationFormState = {
  data: blankTransformation, beforeImageFile: null, afterImageFile: null
};

const blankTestimonial: Omit<Testimonial, 'createdAt'> = {
  id: '',
  customerName: '',
  testimonial: '',
  rating: 5,
  image: '',
  featured: false,
};

type TestimonialFormState = {
  data: Omit<Testimonial, 'createdAt'>;
  imageFile: string | null;
};

const blankTestimonialForm: TestimonialFormState = { data: blankTestimonial, imageFile: null };

type UserDoc = {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type ContactMessageDoc = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  status?: string;
  emailStatus?: string;
  createdAt?: unknown;
};

type SmsLogDoc = {
  id: string;
  orderId?: string;
  recipientType?: string;
  phone?: string;
  event?: string;
  orderStatus?: string;
  status?: string;
  error?: string;
  createdAt?: unknown;
};


type AdminUserStats = {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  disabledUsers: number;
  superAdmins: number;
  admins: number;
  staffMembers: number;
};

const emptyAdminUserStats: AdminUserStats = {
  totalUsers: 0,
  activeUsers: 0,
  onlineUsers: 0,
  disabledUsers: 0,
  superAdmins: 0,
  admins: 0,
  staffMembers: 0,
};

function firestoreDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export default function Admin() {
  const router = useRouter();
  const { ready: adminReady, user: adminUser, can } = useAdminAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bridalPackages, setBridalPackages] = useState<BridalPackage[]>([]);
  const [bridalGalleryImages, setBridalGalleryImages] = useState<GalleryImage[]>([]);
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessageDoc[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogDoc[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [adminUserStats, setAdminUserStats] = useState<AdminUserStats>(
    emptyAdminUserStats,
  );

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [ordersPage, setOrdersPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const CATALOG_ITEMS_PER_PAGE = 8;

  const [form, setForm] = useState<Product>(blankProduct);
  const [categoryForm, setCategoryForm] = useState<Category>(blankCategory);
  const [bridalPackageForm, setBridalPackageForm] = useState<BridalPackage>(blankBridalPackage);
  const [transformationForm, setTransformationForm] = useState<TransformationFormState>(blankTransformationForm);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialFormState>(blankTestimonialForm);
  const [galleryImageFile, setGalleryImageFile] = useState<string | null>(null);
  const [galleryImageCaption, setGalleryImageCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [catalogUploadProgress, setCatalogUploadProgress] = useState<{
    kind: 'products' | 'categories' | null;
    percent: number;
  }>({ kind: null, percent: 0 });

  const [couponForm, setCouponForm] = useState({
    id: '',
    code: '',
    discount: 10,
    type: 'percentage',
    minOrder: 0,
    expiryDate: '',
    active: true,
  });

  const [checkoutTaxRate, setCheckoutTaxRate] = useState<number>(7.5);
  const [checkoutShippingFee, setCheckoutShippingFee] = useState<number>(1500);
  const [checkoutDeliveryDaysText, setCheckoutDeliveryDaysText] = useState<string>('2–5 business days');
  const [checkoutDeliveryDaysCount, setCheckoutDeliveryDaysCount] = useState<number>(5);
  const [storeMode, setStoreMode] = useState<'Live' | 'Maintenance'>('Live');
  const [maintenanceEndDate, setMaintenanceEndDate] = useState<string>('');

  const load = useCallback(async () => {
    const [
      loadedProducts,
      loadedCategories,
      loadedBridalPackages,
      loadedGallery,
      loadedTransformations,
      loadedTestimonials,
      loadedCoupons,
    ] = await Promise.all([
      getProducts(),
      getCategories(),
      getBridalPackages(),
      getBridalGalleryImages(),
      getTransformations(),
      getTestimonials(),
      getCoupons(),
    ]);

    setProducts(loadedProducts);
    setCategories(loadedCategories);
    setBridalPackages(loadedBridalPackages);
    setBridalGalleryImages(loadedGallery);
    setTransformations(loadedTransformations);
    setTestimonials(loadedTestimonials);
    setCoupons(loadedCoupons);

    if (can('orders') || can('reports')) {
      setOrders(await getOrders() as AdminOrder[]);
    }
    if (can('bookings')) {
      setBookings(await getBookings());
    }

    try {
      const s = await getCheckoutSettings() as Awaited<ReturnType<typeof getCheckoutSettings>> & {
        deliveryDaysText?: string;
        deliveryDaysCount?: number;
        storeMode?: 'Live' | 'Maintenance';
        maintenanceEndDate?: string;
      };
      setCheckoutTaxRate(s.taxRate);
      setCheckoutShippingFee(s.shippingFee);
      if (s.deliveryDaysText) setCheckoutDeliveryDaysText(s.deliveryDaysText);
      if (s.deliveryDaysCount !== undefined) setCheckoutDeliveryDaysCount(s.deliveryDaysCount);

      const maintenanceHasEnded =
        s.storeMode === 'Maintenance' &&
        !!s.maintenanceEndDate &&
        new Date(s.maintenanceEndDate).getTime() <= Date.now();

      if (maintenanceHasEnded && can('settings')) {
        setStoreMode('Live');
        setMaintenanceEndDate('');
        await saveCheckoutSettings({
          storeMode: 'Live',
          maintenanceEndDate: '',
        });
      } else {
        if (s.storeMode) setStoreMode(s.storeMode);
        setMaintenanceEndDate(s.maintenanceEndDate || '');
      }
    } catch {
      /* Public checkout settings remain optional in the admin dashboard. */
    }

    try {
      const [usersSnap, contactSnap, smsSnap] = await Promise.all([
        can('customers') ? getDocs(collection(db, 'users')) : Promise.resolve(null),
        can('orders') ? getDocs(collection(db, 'contactMessages')) : Promise.resolve(null),
        can('orders') ? getDocs(collection(db, 'smsLogs')) : Promise.resolve(null),
      ]);

      if (usersSnap) {
        setUsers(usersSnap.docs.map((document) => ({ id: document.id, ...document.data() })));
      }
      if (contactSnap) {
        setContactMessages(
          contactSnap.docs
            .map((document) => ({ id: document.id, ...document.data() }) as ContactMessageDoc)
            .sort((left, right) =>
              (firestoreDate(right.createdAt)?.getTime() || 0) -
              (firestoreDate(left.createdAt)?.getTime() || 0),
            ),
        );
      }
      if (smsSnap) {
        setSmsLogs(
          smsSnap.docs
            .map((document) => ({ id: document.id, ...document.data() }) as SmsLogDoc)
            .sort((left, right) =>
              (firestoreDate(right.createdAt)?.getTime() || 0) -
              (firestoreDate(left.createdAt)?.getTime() || 0),
            ),
        );
      }
    } catch (err) {
      console.error('Error loading permitted admin records', err);
    }

    if (can('products')) {
      try {
        const reviewResponse = await fetch('/api/admin/product-reviews', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const reviewData = (await reviewResponse.json().catch(() => ({}))) as { reviews?: ProductReview[] };
        if (reviewResponse.ok && Array.isArray(reviewData.reviews)) setProductReviews(reviewData.reviews);
      } catch (error) {
        console.error('Error loading product reviews', error);
      }
    }

    if (adminUser?.role === 'super_admin') {
      try {
        const response = await fetch('/api/admin/users', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await response.json().catch(() => ({}))) as {
          stats?: AdminUserStats;
        };
        if (response.ok && data.stats) setAdminUserStats(data.stats);
      } catch (error) {
        console.error('Error loading administrator user statistics', error);
      }
    }
  }, [adminUser?.role, can]);

  useEffect(() => {
    if (adminReady) void load();
  }, [adminReady, load]);

  async function submitProduct() {
    const wasEditing = Boolean(form.id);
    const p = {
      ...form,
      id: form.id || Date.now().toString(),
      price: Number(form.price),
      stock: Number(form.stock),
      sizes: form.type === 'product' ? Array.from(new Set(form.sizes || [])) : [],
    };

    await saveProduct(p);
    void recordAdminActivity({
      action: wasEditing ? 'Edited Product' : 'Added Product',
      description: `${wasEditing ? 'Updated' : 'Created'} product or service: ${p.name}.`,
      targetType: 'product',
      targetId: String(p.id),
    });
    showToast(wasEditing ? 'Product updated successfully' : 'Product added successfully', 'success');
    setForm(blankProduct);
    load();
  }

  async function deleteProductReview(review: ProductReview) {
    if (!confirm(`Delete ${review.customerName}'s review?`)) return;
    try {
      const response = await fetch(`/api/admin/product-reviews?id=${encodeURIComponent(review.id)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || data.ok !== true) throw new Error(data.message || 'Review could not be deleted.');
      setProductReviews((current) => current.filter((item) => item.id !== review.id));
      showToast('Product review deleted successfully', 'success');
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Review could not be deleted.';
      showToast(message, 'error');
    }
  }

  async function uploadCategoryImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCatalogUploadProgress({ kind: 'categories', percent: 0 });
    try {
      const imageUrl = await uploadCatalogImage(file, 'categories', {
        onProgress: (percent) => setCatalogUploadProgress({ kind: 'categories', percent }),
      });
      setCategoryForm((prev) => ({ ...prev, image: imageUrl }));
      showToast('Category image uploaded.', 'success');
    } catch (error) {
      console.error('CATEGORY IMAGE UPLOAD ERROR:', error);
      showToast(error instanceof Error ? error.message : 'Category image upload failed.', 'error');
    } finally {
      e.target.value = '';
      setIsUploading(false);
      setCatalogUploadProgress({ kind: null, percent: 0 });
    }
  }

  async function uploadProductImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCatalogUploadProgress({ kind: 'products', percent: 0 });
    try {
      const imageUrl = await uploadCatalogImage(file, 'products', {
        onProgress: (percent) => setCatalogUploadProgress({ kind: 'products', percent }),
      });
      setForm((current) => ({ ...current, image: imageUrl }));
      showToast('Product image uploaded.', 'success');
    } catch (error) {
      console.error('PRODUCT IMAGE UPLOAD ERROR:', error);
      showToast(error instanceof Error ? error.message : 'Product image upload failed.', 'error');
    } finally {
      e.target.value = '';
      setIsUploading(false);
      setCatalogUploadProgress({ kind: null, percent: 0 });
    }
  }

  async function submitCategory() {
    const wasEditing = Boolean(categoryForm.id);
    if (!categoryForm.name.trim()) {
      alert('Please enter category name');
      return;
    }

    const newCategory: Category = {
      ...categoryForm,
      id: categoryForm.id || Date.now().toString(),
    };

    await saveCategory(newCategory);
    void recordAdminActivity({
      action: wasEditing ? 'Edited Category' : 'Added Category',
      description: `${wasEditing ? 'Updated' : 'Created'} category: ${newCategory.name}.`,
      targetType: 'category',
      targetId: String(newCategory.id),
    });
    showToast(wasEditing ? 'Category updated successfully' : 'Category added successfully', 'success');
    setCategoryForm(blankCategory);
    load();
  }

  function editCategory(category: Category) {
    setCategoryForm(category);
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    await removeCategory(id);
    void recordAdminActivity({
      action: 'Deleted Category',
      description: `Deleted category ${id}.`,
      targetType: 'category',
      targetId: String(id),
    });
    showToast('Category deleted successfully', 'success');
    load();
  }

  async function submitBridalPackage() {
    const wasEditing = Boolean(bridalPackageForm.id);
    if (!bridalPackageForm.name.trim() || !bridalPackageForm.price) {
      alert('Please enter package name and price.');
      return;
    }

    const newPackage: BridalPackage = {
      ...bridalPackageForm,
      id: bridalPackageForm.id || Date.now().toString(),
      price: Number(bridalPackageForm.price),
    };

    await saveBridalPackage(newPackage);
    void recordAdminActivity({
      action: wasEditing ? 'Edited Bridal Package' : 'Added Bridal Package',
      description: `${wasEditing ? 'Updated' : 'Created'} bridal package: ${newPackage.name}.`,
      targetType: 'bridalPackage',
      targetId: String(newPackage.id),
    });
    showToast('Bridal package saved!', 'success');
    setBridalPackageForm(blankBridalPackage);
    load();
  }

  function editBridalPackage(pkg: BridalPackage) {
    setBridalPackageForm(pkg);
    document.getElementById('bridal-packages')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleGalleryImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setGalleryImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleGalleryImageUpload() {
    if (!galleryImageFile) {
      alert('Please select an image to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await addBridalGalleryImage(galleryImageFile, galleryImageCaption);
      void recordAdminActivity({
        action: 'Added Gallery Image',
        description: `Added a bridal gallery image${galleryImageCaption ? `: ${galleryImageCaption}` : '.'}`,
        targetType: 'gallery',
      });
      showToast('Image uploaded to bridal gallery!', 'success');
      setGalleryImageFile(null);
      setGalleryImageCaption('');
      load();
    } catch (error) {
      showToast('Image upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  function handleTransformationImageSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTransformationForm(prev => ({
        ...prev,
        [`${type}ImageFile`]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function submitTransformation() {
    const { data, beforeImageFile, afterImageFile } = transformationForm;
    const wasEditing = Boolean(data.id);
    if (!data.title || !data.category) {
      alert('Please enter a title and select a category.');
      return;
    }
    if (!data.id && (!beforeImageFile || !afterImageFile)) {
      alert('Please upload both a "before" and "after" image for new transformations.');
      return;
    }

    setIsUploading(true);
    try {
      const transformationToSave = {
        ...data,
        id: data.id || Date.now().toString(),
      };
      await saveTransformation(transformationToSave, beforeImageFile, afterImageFile);
      void recordAdminActivity({
        action: wasEditing ? 'Edited Transformation' : 'Added Transformation',
        description: `${wasEditing ? 'Updated' : 'Created'} before-and-after transformation: ${transformationToSave.title}.`,
        targetType: 'transformation',
        targetId: String(transformationToSave.id),
      });
      showToast('Transformation saved successfully!', 'success');
      setTransformationForm(blankTransformationForm);
      load();
    } catch (error) {
      showToast('Failed to save transformation.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  function editTransformation(t: Transformation) {
    setTransformationForm({ data: t, beforeImageFile: null, afterImageFile: null });
    document.getElementById('transformations-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleTestimonialImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTestimonialForm(prev => ({ ...prev, imageFile: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function submitTestimonial() {
    const { data, imageFile } = testimonialForm;
    const wasEditing = Boolean(data.id);
    if (!data.customerName || !data.testimonial) {
      alert('Please enter customer name and testimonial text.');
      return;
    }

    setIsUploading(true);
    try {
      const testimonialToSave = {
        ...data,
        id: data.id || Date.now().toString(),
        rating: Number(data.rating),
      };
      await saveTestimonial(testimonialToSave, imageFile);
      void recordAdminActivity({
        action: wasEditing ? 'Edited Testimonial' : 'Added Testimonial',
        description: `${wasEditing ? 'Updated' : 'Created'} testimonial for ${testimonialToSave.customerName}.`,
        targetType: 'testimonial',
        targetId: String(testimonialToSave.id),
      });
      showToast('Testimonial saved successfully!', 'success');
      setTestimonialForm(blankTestimonialForm);
      load();
    } catch (error) {
      showToast('Failed to save testimonial.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  function editTestimonial(t: Testimonial) {
    setTestimonialForm({ data: t, imageFile: null });
    document.getElementById('testimonials-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function submitCoupon() {
    const wasEditing = Boolean(couponForm.id);
    const promotionId = couponForm.id || Date.now().toString();
    await saveCoupon({
      ...couponForm,
      id: promotionId,
      discount: Number(couponForm.discount),
      minOrder: Number(couponForm.minOrder),
    } as Coupon);

    void recordAdminActivity({
      action: wasEditing ? 'Edited Promotion' : 'Added Promotion',
      description: `${wasEditing ? 'Updated' : 'Created'} promotion code ${couponForm.code}.`,
      targetType: 'promotion',
      targetId: promotionId,
    });

    showToast(wasEditing ? 'Promotion updated successfully' : 'Promotion created successfully', 'success');

    setCouponForm({
      id: '',
      code: '',
      discount: 10,
      type: 'percentage',
      minOrder: 0,
      expiryDate: '',
      active: true,
    });

    load();
  }

  async function handleRefund(order: AdminOrder) {
    if (order.paymentMethod !== 'OPay') {
      showToast('Automatic refunds are not configured for this payment method.', 'error');
      return;
    }

    const confirmed = confirm(
      `Process the refund for order #${order.id} in the OPay Business Dashboard first. ` +
        'Click OK only after OPay confirms the refund. The order will then be marked Refunded.',
    );

    if (!confirmed) return;

    try {
      await updateOrderStatus(order.id, 'Refunded');
      void recordAdminActivity({
        action: 'Processed Order',
        description: `Marked order #${order.id} as Refunded after OPay confirmation.`,
        targetType: 'order',
        targetId: String(order.id),
      });
      showToast(
        'Order marked as Refunded. Keep the OPay refund confirmation for your records.',
        'success',
      );
      await load();
    } catch (error) {
      console.error('Refund status update failed:', error);
      showToast('The order could not be marked as Refunded.', 'error');
    }
  }



  async function updateOrderStatusWithNotification(
    order: AdminOrder,
    status: 'Processing' | 'Ready for Shipment' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled',
  ) {
    try {
      const statusResult = await updateOrderStatus(order.id, status);
      void recordAdminActivity({
        action: 'Updated Order Status',
        description: `Updated order #${order.id} to ${status}.`,
        targetType: 'order',
        targetId: String(order.id),
        metadata: { status },
      });

      if (status !== 'Cancelled') {
        const response = await fetch('/api/termii/send-status-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ orderId: order.id, status }),
        });

        const responseText = await response.text();
        const data = responseText
          ? (JSON.parse(responseText) as { success?: boolean; message?: string })
          : {};

        if (!response.ok || !data.success) {
          showToast(
            data.message || `Order updated to ${status}, but the SMS was not sent.`,
            'error',
          );
        } else {
          showToast(`Order updated to ${status}. Customer SMS sent. Email: ${statusResult?.emailStatus || 'logged'}.`, 'success');
        }
      } else {
        showToast(`Order cancelled. Customer email: ${statusResult?.emailStatus || 'logged'}.`, 'success');
      }

      await load();
    } catch (error) {
      console.error('Order status update failed:', error);
      showToast('The order status could not be updated.', 'error');
    }
  }

  async function retryOrderEmails(orderId: string) {
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/retry-email`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { ok?: boolean; message?: string }) : {};
      if (!response.ok || !data.ok) throw new Error(data.message || 'Email retry failed.');
      showToast(data.message || 'Email retry completed.', 'success');
      await load();
    } catch (error) {
      console.error('Order email retry failed:', error);
      showToast(error instanceof Error ? error.message : 'Email retry failed.', 'error');
    }
  }

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0;
  const activeCategories = categories.filter((c) => c.active).length;
  const productCategories = categories.filter((c) => c.type === 'product').length;
  const serviceCategories = categories.filter((c) => c.type === 'service').length;
  const lowStockProducts = products
    .filter((product) => product.type !== 'service' && Number(product.stock || 0) <= 5)
    .sort((left, right) => Number(left.stock || 0) - Number(right.stock || 0));
  type ProductWithSales = Product & { qtySold?: number };

  const bestSellingProducts = [...products]
    .filter((product) => product.type !== 'service')
    .sort(
      (left, right) =>
        Number((right as ProductWithSales).qtySold || 0) -
        Number((left as ProductWithSales).qtySold || 0),
    )
    .slice(0, 5);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    users.forEach(u => {
      const key = (u.email || u.phone || u.id || '').toLowerCase().trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          id: u.id || key,
          name: u.name || u.fullName || 'Unknown',
          email: u.email || 'N/A',
          phone: u.phone || 'N/A',
          address: u.address || 'N/A',
          orderCount: 0,
          totalSpent: 0,
          orders: []
        });
      }
    });

    orders.forEach(o => {
      const key = (o.customerEmail || o.customerPhone || o.id || '').toLowerCase().trim();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: o.customerName || 'Unknown',
          email: o.customerEmail || 'N/A',
          phone: o.customerPhone || 'N/A',
          address: o.shippingAddress || o.customerAddress || o.address || 'N/A',
          orderCount: 0,
          totalSpent: 0,
          orders: []
        });
      }

      const c = map.get(key)!;
      c.orders.push(o);
      c.orderCount++;
      c.totalSpent += Number(o.total || 0);

      const oDate = new Date(o.createdAt || 0);
      if (!c.lastOrderDate || oDate > new Date(c.lastOrderDate)) {
        c.lastOrderDate = o.createdAt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [users, orders]);

  const topCustomers = [...customers]
    .sort((left, right) => right.totalSpent - left.totalSpent)
    .slice(0, 5);

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || 
           c.email.toLowerCase().includes(q) || 
           c.phone.toLowerCase().includes(q);
  });

  useEffect(() => {
    setCustomersPage(1);
  }, [customerSearch]);

  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase();
    return (
      String(o.id).toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      (o.paymentMethod || '').toLowerCase().includes(q) ||
      (o.paymentReference || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q) ||
      (o.customerPhone || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setOrdersPage(1);
  }, [orderSearch]);

  const totalOrdersPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);

  const totalCustomersPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const paginatedCustomers = filteredCustomers.slice((customersPage - 1) * ITEMS_PER_PAGE, customersPage * ITEMS_PER_PAGE);

  const totalProductsPages = Math.ceil(products.length / CATALOG_ITEMS_PER_PAGE) || 1;
  const paginatedProducts = products.slice(
    (productsPage - 1) * CATALOG_ITEMS_PER_PAGE,
    productsPage * CATALOG_ITEMS_PER_PAGE,
  );

  const totalCategoriesPages = Math.ceil(categories.length / CATALOG_ITEMS_PER_PAGE) || 1;
  const paginatedCategories = categories.slice(
    (categoriesPage - 1) * CATALOG_ITEMS_PER_PAGE,
    categoriesPage * CATALOG_ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (productsPage > totalProductsPages) setProductsPage(totalProductsPages);
  }, [productsPage, totalProductsPages]);

  useEffect(() => {
    if (categoriesPage > totalCategoriesPages) setCategoriesPage(totalCategoriesPages);
  }, [categoriesPage, totalCategoriesPages]);

  function getEstimatedDeliveryDate(order: AdminOrder) {
    if (order.estimatedDeliveryDate) {
      const savedDate = new Date(order.estimatedDeliveryDate);
      if (!Number.isNaN(savedDate.getTime())) return savedDate;
    }

    if (order.createdAt && checkoutDeliveryDaysCount > 0) {
      const createdDate = new Date(order.createdAt);
      if (!Number.isNaN(createdDate.getTime())) {
        const estimatedDate = new Date(createdDate);
        estimatedDate.setDate(estimatedDate.getDate() + Number(checkoutDeliveryDaysCount));
        return estimatedDate;
      }
    }

    return null;
  }

  function getEstimatedDeliveryDisplay(order: AdminOrder) {
    const estimatedDate = getEstimatedDeliveryDate(order);
    return estimatedDate ? estimatedDate.toLocaleDateString() : 'N/A';
  }

  function getDeliveryLabel(order: AdminOrder) {
    return (
      order.deliveryDays ||
      order.deliveryDaysText ||
      (getEstimatedDeliveryDate(order)
        ? `Estimated by ${getEstimatedDeliveryDisplay(order)}`
        : checkoutDeliveryDaysText || 'N/A')
    );
  }

  async function saveAdminCheckoutSettings() {
    const nextMode = storeMode;
    const nextMaintenanceEndDate = nextMode === 'Maintenance' ? maintenanceEndDate : '';

    await saveCheckoutSettings({
      taxRate: Number(checkoutTaxRate),
      shippingFee: Number(checkoutShippingFee),
      deliveryDaysText: checkoutDeliveryDaysText.trim() || '2–5 business days',
      deliveryDaysCount: Number(checkoutDeliveryDaysCount),
      storeMode: nextMode,
      maintenanceEndDate: nextMaintenanceEndDate,
    });

    setMaintenanceEndDate(nextMaintenanceEndDate);
    void recordAdminActivity({
      action: 'Changed Settings',
      description: `Updated checkout settings and set store mode to ${nextMode}.`,
      targetType: 'settings',
      targetId: 'checkout',
    });
    showToast(
      nextMode === 'Maintenance'
        ? 'Maintenance mode saved successfully'
        : 'Live mode saved successfully',
      'success'
    );
  }

  const exportCustomersCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Orders', 'Total Spent', 'Last Order'];
    const rows = filteredCustomers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.address || 'N/A').replace(/"/g, '""')}"`,
      c.orderCount,
      c.totalSpent,
      `"${c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleString() : 'N/A'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jayluxe-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Status', 'Total', 'Payment Method', 'Payment Reference', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Estimated Delivery Date'];
    const rows = filteredOrders.map(o => [
      `"${o.id}"`,
      `"${o.status || 'Processing'}"`,
      Number(o.total || 0),
      `"${o.paymentMethod || 'Paystack'}"`,
      `"${o.paymentReference || 'N/A'}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A'}"`,
      `"${(o.customerName || 'N/A').replace(/"/g, '""')}"`,
      `"${(o.customerEmail || 'N/A').replace(/"/g, '""')}"`,
      `"${(o.customerPhone || 'N/A').replace(/"/g, '""')}"`,
      `"${getEstimatedDeliveryDisplay(o)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jayluxe-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCustomerPDF = () => {
    if (!selectedCustomer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Customer Details - ${selectedCustomer.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; }
            h2 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
            .details-grid { display: flex; gap: 40px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px; }
            .details-grid p { margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; }
          </style>
        </head>
        <body>
          <h2>Customer Details</h2>
          <div class="details-grid">
            <div>
              <p><strong>Name:</strong> ${selectedCustomer.name}</p>
              <p><strong>Email:</strong> ${selectedCustomer.email}</p>
              <p><strong>Phone:</strong> ${selectedCustomer.phone}</p>
              <p><strong>Address:</strong> ${selectedCustomer.address}</p>
            </div>
            <div>
              <p><strong>Total Orders:</strong> ${selectedCustomer.orderCount}</p>
              <p><strong>Total Spent:</strong> ${money(selectedCustomer.totalSpent)}</p>
              <p><strong>Last Order:</strong> ${selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleString() : 'N/A'}</p>
            </div>
          </div>

          <h3>Order History</h3>
          ${selectedCustomer.orders.length === 0 ? '<p>No orders yet.</p>' : `
            <table>
              <thead>
                <tr><th>Order ID</th><th>Date</th><th>Status</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${selectedCustomer.orders.map(o => `<tr><td>#${o.id}</td><td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td><td>${o.status || 'Processing'}</td><td>${money(Number(o.total || 0))}</td></tr>`).join('')}
              </tbody>
            </table>
          `}
          <script>window.onload = () => setTimeout(() => { window.print(); window.close(); }, 250);</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportOrderInvoicePDF = (order: AdminOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = order.items || [];
    const subtotal = order.subtotal || order.total || 0;
    const shipping = order.shipping || 0;
    const tax = order.tax || 0;
    const total = order.total || 0;

    const html = `
      <html>
        <head>
          <title>Invoice - Order #${order.id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #d4af37; }
            .header p { margin: 4px 0; color: #666; }
            .invoice-details { display: flex; gap: 40px; margin-bottom: 40px; }
            .invoice-details div { flex: 1; }
            h3 { border-bottom: 1px solid #eaeaea; padding-bottom: 8px; margin-bottom: 16px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; color: #333; }
            .totals { width: 300px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8fafc; }
            .totals-row.grand-total { font-weight: bold; font-size: 1.1em; border-bottom: none; border-top: 2px solid #eaeaea; padding-top: 12px; margin-top: 8px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
            .badge.green { background: #dcfce7; color: #166534; }
            .badge.gold { background: #fef08a; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>JayLuxe</h1>
              <p>Luxury Beauty, Fashion &amp; Lifestyle Store</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0 0 8px 0;">INVOICE</h2>
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
              ${getDeliveryLabel(order) !== 'N/A' ? `<p><strong>Estimated Delivery:</strong> ${getDeliveryLabel(order)}</p>` : ''}
              <p><strong>Status:</strong> <span class="badge ${order.status === 'Delivered' ? 'green' : 'gold'}">${order.status || 'Processing'}</span></p>
            </div>
          </div>

          <div class="invoice-details">
            <div>
              <h3>Bill To:</h3>
              <p><strong>${order.customerName || 'N/A'}</strong></p>
              <p>${order.customerEmail || 'N/A'}</p>
              <p>${order.customerPhone || 'N/A'}</p>
            </div>
            <div>
              <h3>Ship To:</h3>
              <p>${order.shippingAddress || order.customerAddress || order.address || 'N/A'}</p>
            </div>
            <div>
              <h3>Payment Info:</h3>
              <p><strong>Method:</strong> ${order.paymentMethod || 'Paystack'}</p>
              <p><strong>Reference:</strong> ${order.paymentReference || 'N/A'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.length > 0 ? items.map((item) => `
                <tr>
                  <td>
                    <div style="font-weight: 500;">${item.name || 'Product'}</div>
                    <div style="font-size: 0.9em; color: #666;">${item.category || ''}</div>
                  </td>
                  <td>${money(Number(item.price || 0))}</td>
                  <td>${item.qty || item.quantity || 1}</td>
                  <td style="text-align: right;">${money(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}</td>
                </tr>
              `).join('') : `<tr><td colSpan="4" style="text-align: center;">No items found.</td></tr>`}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${money(Number(subtotal))}</span>
            </div>
            <div class="totals-row">
              <span>Shipping:</span>
              <span>${money(Number(shipping))}</span>
            </div>
            <div class="totals-row">
              <span>Tax:</span>
              <span>${money(Number(tax))}</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total:</span>
              <span>${money(Number(total))}</span>
            </div>
          </div>

          <script>window.onload = () => setTimeout(() => { window.print(); window.close(); }, 250);</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  async function handleAdminLogout() {
    try {
      await Promise.allSettled([
        fetch('/api/admin/session', { method: 'DELETE' }),
        signOut(auth),
      ]);
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  if (!adminReady) {
    return (
      <main className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-content">
            <h1>Opening JayLuxe Admin</h1>
            <p role="status">Verifying the secure administrator session…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-dashboard-nav-shell">
        <a className="admin-dashboard-nav-brand" href="#admin" aria-label="JayLuxe Admin dashboard home">
          <strong>JayLuxe</strong>
          <small>Administration</small>
        </a>

        <nav className="admin-dashboard-nav" aria-label="Administrator dashboard navigation">
          <a href="#admin"><LayoutDashboard size={16} aria-hidden="true" /> Dashboard</a>
          {can('orders') ? <a href="#orders"><ClipboardList size={16} aria-hidden="true" /> Orders</a> : null}
          {can('customers') ? <a href="#customers"><UsersRound size={16} aria-hidden="true" /> Customers</a> : null}
          {can('products') ? <a href="#products"><Boxes size={16} aria-hidden="true" /> Products</a> : null}
          {can('categories') ? <a href="#categories"><Layers3 size={16} aria-hidden="true" /> Categories</a> : null}
          {can('products') ? <a href="#inventory"><BarChart3 size={16} aria-hidden="true" /> Inventory</a> : null}
          {can('promotions') ? <a href="#coupons"><TicketPercent size={16} aria-hidden="true" /> Promotions</a> : null}
          {can('bookings') ? <a href="#bookings"><CalendarDays size={16} aria-hidden="true" /> Bookings</a> : null}
          {can('testimonials') ? <a href="#testimonials-form"><MessageCircle size={16} aria-hidden="true" /> Testimonials</a> : null}
          {can('content') ? <a href="#transformations-form"><Images size={16} aria-hidden="true" /> Before &amp; After</a> : null}
          {can('settings') ? <a href="#settings"><Settings size={16} aria-hidden="true" /> Settings</a> : null}
          {can('reports') ? <Link href="/admin/reports"><BarChart3 size={16} aria-hidden="true" /> Reports</Link> : null}
          {adminUser?.role === 'super_admin' ? <Link href="/admin/users"><UserCog size={16} aria-hidden="true" /> Admin &amp; Staff</Link> : null}
          {can('activity') ? <Link href="/admin/activity"><Activity size={16} aria-hidden="true" /> Activity</Link> : null}
          {can('orders') ? <a href="#contact-messages"><Mail size={16} aria-hidden="true" /> Messages</a> : null}
          {can('orders') ? <a href="#sms-logs"><Smartphone size={16} aria-hidden="true" /> SMS</a> : null}
        </nav>

        <button
          type="button"
          className="admin-dashboard-nav-logout"
          onClick={handleAdminLogout}
          aria-label="Log out of JayLuxe administration"
        >
          <LogOut size={16} aria-hidden="true" /> <span>Logout</span>
        </button>
      </header>

      <main className="admin-content">
        <div className="admin-mobile-actionbar" aria-label="Admin mobile quick actions">
          <a href="#products" title="Search products" aria-label="Search products"><Search size={18} aria-hidden="true" /></a>
          <Link href="/wishlist" title="Wishlist" aria-label="Wishlist"><Heart size={18} aria-hidden="true" /></Link>
          <Link href="/bridal" title="Bridal Package" aria-label="Bridal Package"><Gem size={18} aria-hidden="true" /></Link>
          <Link href="/bridal/book" title="Book Bridal Consultation" aria-label="Book Bridal Consultation"><CalendarDays size={18} aria-hidden="true" /></Link>
          <Link href="/gallery" title="Before & After" aria-label="Before & After"><Images size={18} aria-hidden="true" /></Link>
          <Link href="/testimonials" title="Testimonials" aria-label="Testimonials"><MessageCircle size={18} aria-hidden="true" /></Link>
          <Link href="/promotions" title="Promotions" aria-label="Promotions"><Tags size={18} aria-hidden="true" /></Link>
        </div>

        <div className="topbar" id="admin">
          <div>
            <h1>Welcome Back {adminUser?.fullName || 'Admin'}</h1>
            <p>Manage JayLuxe products, services, categories, orders and bookings.</p>
          </div>

          <div className="admin-topbar-controls">
            <span className={`admin-store-status ${storeMode === 'Live' ? 'live' : 'maintenance'}`}>
              {storeMode === 'Live' ? 'Live Mode' : 'Maintenance Mode'}
            </span>
            <button className="btn" onClick={load}>Refresh</button>
          </div>
          
        </div>

        <div className="stats-grid admin-dashboard-metrics" aria-label="Primary financial metrics">
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="stat-card dark admin-metric-card">
            <span className="admin-metric-icon"><BadgeDollarSign size={19} aria-hidden="true" /></span>
            <div><h3>Total Revenue</h3><h1>{money(revenue)}</h1><p>Verified order value</p></div>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }} className="stat-card admin-metric-card">
            <span className="admin-metric-icon"><ShoppingBag size={19} aria-hidden="true" /></span>
            <div><h3>Total Orders</h3><h1>{orders.length}</h1><p>All recorded orders</p></div>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.08 }} className="stat-card admin-metric-card">
            <span className="admin-metric-icon"><BarChart3 size={19} aria-hidden="true" /></span>
            <div><h3>Average Order Value</h3><h1>{money(averageOrderValue)}</h1><p>Revenue per recorded order</p></div>
          </motion.article>
        </div>

        <div className="admin-operational-metrics" aria-label="Operational metrics">
          <article>
            <span><Package2 size={17} aria-hidden="true" /></span>
            <div><small>Products &amp; Services</small><strong>{products.length}</strong></div>
          </article>
          <article>
            <span><UsersRound size={17} aria-hidden="true" /></span>
            <div><small>Customers</small><strong>{customers.length}</strong></div>
          </article>
        </div>

        {adminUser?.role === 'super_admin' ? (
          <section className="table-card admin-team-overview" aria-labelledby="admin-team-overview-title">
            <div className="admin-section-title">
              <div>
                <h2 id="admin-team-overview-title">Admin &amp; Staff Overview</h2>
                <p>Access, staffing and user management in one compact view.</p>
              </div>
            </div>
            <div className="admin-team-grid">
              <article className="admin-team-card">
                <span><ShieldCheck size={20} aria-hidden="true" /></span>
                <div><small>Admin Overview</small><strong>{adminUserStats.superAdmins + adminUserStats.admins}</strong><p>{adminUserStats.superAdmins} super admin{adminUserStats.superAdmins === 1 ? '' : 's'} · {adminUserStats.admins} admin{adminUserStats.admins === 1 ? '' : 's'}</p></div>
              </article>
              <article className="admin-team-card">
                <span><UserCog size={20} aria-hidden="true" /></span>
                <div><small>Staff Overview</small><strong>{adminUserStats.staffMembers}</strong><p>{adminUserStats.disabledUsers} disabled account{adminUserStats.disabledUsers === 1 ? '' : 's'}</p></div>
              </article>
              <Link className="admin-team-card admin-team-action-card" href="/admin/users">
                <span><UsersRound size={20} aria-hidden="true" /></span>
                <div><small>Manage Users</small><strong>Open</strong><p>Add, edit, disable and review administrator or staff access.</p></div>
              </Link>
            </div>
          </section>
        ) : null}

        <section className="table-card" id="analytics" hidden={!can('dashboard')}>
          <div className="admin-section-title">
            <div>
              <h2>Commerce Analytics</h2>
              <p>Operational highlights for inventory, customers and product performance.</p>
            </div>
          </div>

          <div className="admin-insight-grid">
            <article>
              <small>Low stock alerts</small>
              <strong>{lowStockProducts.length}</strong>
              <ul>
                {lowStockProducts.slice(0, 5).map((product) => (
                  <li key={product.id}>
                    <span>{product.name}</span>
                    <b>{Number(product.stock || 0)} left</b>
                  </li>
                ))}
                {lowStockProducts.length === 0 ? <li>All stocked products are above the alert level.</li> : null}
              </ul>
            </article>

            <article>
              <small>Top customers</small>
              <strong>{topCustomers.length}</strong>
              <ul>
                {topCustomers.map((customer) => (
                  <li key={customer.id}>
                    <span>{customer.name}</span>
                    <b>{money(customer.totalSpent)}</b>
                  </li>
                ))}
                {topCustomers.length === 0 ? <li>No customer purchase data yet.</li> : null}
              </ul>
            </article>

            <article>
              <small>Best-selling products</small>
              <strong>{bestSellingProducts.length}</strong>
              <ul>
                {bestSellingProducts.map((product) => (
                  <li key={product.id}>
                    <span>{product.name}</span>
                    <b>{Number((product as ProductWithSales).qtySold || 0)} sold</b>
                  </li>
                ))}
                {bestSellingProducts.length === 0 ? <li>No product sales data yet.</li> : null}
              </ul>
            </article>
          </div>
        </section>

        <section className="table-card" id="settings" hidden={!can('settings')}>
  <h2>Store & Checkout Settings</h2>
  <p style={{ color: '#64748b', marginBottom: '22px' }}>
    Store status, tax percentage, shipping fee, and delivery estimates.
  </p>

  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '18px',
      alignItems: 'end',
    }}
  >
    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Store Mode
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        Choose if customers can shop or if the store is under maintenance.
      </p>

      <select
        className="input"
        value={storeMode}
        onChange={(e) =>
          setStoreMode(e.target.value as 'Live' | 'Maintenance')
        }
      >
        <option value="Live">Live Mode</option>
        <option value="Maintenance">Maintenance Mode</option>
      </select>
    </div>

    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Tax Rate
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        Percentage added as tax at checkout.
      </p>

      <input
        className="input"
        type="number"
        value={checkoutTaxRate}
        onChange={(e) => setCheckoutTaxRate(Number(e.target.value))}
        placeholder="Example: 7.5"
      />
    </div>

    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Shipping Fee
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        Delivery fee customers will pay at checkout.
      </p>

      <input
        className="input"
        type="number"
        value={checkoutShippingFee}
        onChange={(e) => setCheckoutShippingFee(Number(e.target.value))}
        placeholder="Example: 1500"
      />
    </div>

    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Delivery Text
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        This is what customers will see, like “1–2 business days”.
      </p>

      <input
        className="input"
        value={checkoutDeliveryDaysText}
        onChange={(e) => setCheckoutDeliveryDaysText(e.target.value)}
        placeholder="Example: 1–2 business days"
      />
    </div>

    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Delivery Days Count
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        Used to calculate the estimated delivery date.
      </p>

      <input
        className="input"
        type="number"
        value={checkoutDeliveryDaysCount}
        onChange={(e) => setCheckoutDeliveryDaysCount(Number(e.target.value))}
        placeholder="Example: 2"
      />
    </div>

    <div>
      <label
        style={{
          display: 'block',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#111827',
        }}
      >
        Maintenance End Date
      </label>
      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '13px' }}>
        Optional date when maintenance should end.
      </p>

      <input
        className="input"
        type="datetime-local"
        value={maintenanceEndDate}
        onChange={(e) => setMaintenanceEndDate(e.target.value)}
        disabled={storeMode !== 'Maintenance'}
      />
    </div>
  </div>

  <button
    className="btn"
    onClick={saveAdminCheckoutSettings}
    style={{ marginTop: '22px' }}
  >
    Save Settings
  </button>
</section>

        <section className="table-card category-card" id="categories" hidden={!can('categories')}>
          <div className="admin-section-title">
            <div>
              <h2>Add / Edit Category</h2>
              <p>Create categories for products and services.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <input
              className="input"
              placeholder="Category Name"
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, name: e.target.value })
              }
            />

            <select
              className="input"
              value={categoryForm.type}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  type: e.target.value as 'product' | 'service',
                })
              }
            >
              <option value="product">Product</option>
              <option value="service">Service</option>
            </select>

            <select
              className="input"
              value={categoryForm.active ? 'active' : 'inactive'}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  active: e.target.value === 'active',
                })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="category-upload-box admin-image-upload">
              <div className="admin-image-upload-heading">
                <div>
                  <label htmlFor="category-image-upload">Category Image</label>
                  <p className="admin-upload-note">JPEG, PNG or WebP, up to 8 MB.</p>
                </div>
                {categoryForm.image ? (
                  <div className="admin-image-preview-actions">
                    <label className="btn light admin-image-replace" htmlFor="category-image-upload" aria-disabled={isUploading}>Replace image</label>
                    <button className="btn light" type="button" disabled={isUploading} onClick={() => setCategoryForm((current) => ({ ...current, image: '' }))}>Remove image</button>
                  </div>
                ) : null}
              </div>
              <input id="category-image-upload" className="admin-image-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading} onChange={uploadCategoryImage} />
              {catalogUploadProgress.kind === 'categories' ? (
                <div className="admin-upload-progress" role="status" aria-live="polite">
                  <span>Uploading image… {catalogUploadProgress.percent}%</span>
                  <progress max="100" value={catalogUploadProgress.percent}>{catalogUploadProgress.percent}%</progress>
                </div>
              ) : null}

              {categoryForm.image ? (
                <img
                  src={categoryForm.image}
                  alt="Category Preview"
                  className="category-preview admin-image-preview"
                />
              ) : <p className="admin-image-empty">Choose an image to add a category thumbnail.</p>}
            </div>

            <textarea
              className="input"
              placeholder="Description"
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, description: e.target.value })
              }
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" onClick={submitCategory} disabled={isUploading}>
              {catalogUploadProgress.kind === 'categories' ? `Uploading image… ${catalogUploadProgress.percent}%` : (categoryForm.id ? 'Update Category' : 'Save Category')}
            </button>

            <button
              className="btn light"
              onClick={() => setCategoryForm(blankCategory)}
            >
              Clear
            </button>
          </div>
        </section>

        <div className="stats-grid">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3 }} className="stat-card">
            <h3>Total Categories</h3>
            <h1>{categories.length}</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.1 }} className="stat-card">
            <h3>Product Categories</h3>
            <h1>{productCategories}</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.2 }} className="stat-card">
            <h3>Service Categories</h3>
            <h1>{serviceCategories}</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.3 }} className="stat-card">
            <h3>Active Categories</h3>
            <h1>{activeCategories}</h1>
          </motion.div>
        </div>

        <section className="table-card admin-categories-list">
          <div className="admin-section-title"><div><h2>All Categories</h2><p>Manage category presentation and see how many products are assigned to each category.</p></div></div>
          <div className="admin-table-scroll">
            <table className="table">
              <thead><tr><th>Category</th><th>Description</th><th>Type</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginatedCategories.map((c) => {
                  const productCount = products.filter((product) => product.category === c.name).length;
                  return <tr key={String(c.id)}>
                    <td><div className="admin-product-cell">{c.image ? <img src={c.image} alt="" /> : <span className="admin-product-image-placeholder"><Layers3 size={18} aria-hidden="true" /></span>}<div><strong>{c.name}</strong><small>{c.slug || c.id}</small></div></div></td>
                    <td className="admin-description-cell">{c.description || 'No category description provided.'}</td>
                    <td><span className="badge gold">{c.type}</span></td>
                    <td><strong>{productCount}</strong></td>
                    <td><span className={c.active ? 'badge green' : 'badge red'}>{c.active ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="admin-row-actions"><button onClick={() => editCategory(c)}>Edit</button><button onClick={() => deleteCategory(c.id)}>Delete</button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination page={categoriesPage} totalPages={totalCategoriesPages} onPageChange={setCategoriesPage} label="Categories" />
        </section>

        <section className="table-card" id="bridal-packages" hidden={!can('products')}>
          <div className="admin-section-title">
            <div>
              <h2>Bridal Packages</h2>
              <p>Manage the bridal packages offered on the homepage.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <input
              className="input"
              placeholder="Package Name (e.g., Gold Bridal Package)"
              value={bridalPackageForm.name}
              onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Price (e.g., 80000)"
              type="number"
              value={bridalPackageForm.price}
              onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, price: Number(e.target.value) })}
            />
            <textarea
              className="input"
              placeholder="Features (one per line)"
              value={bridalPackageForm.features.join('\n')}
              onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, features: e.target.value.split('\n') })}
              style={{ gridColumn: '1 / -1' }}
            />
            <textarea
              className="input"
              placeholder="Description (optional)"
              value={bridalPackageForm.description}
              onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, description: e.target.value })}
              style={{ gridColumn: '1 / -1' }}
            />
            <label className="input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={bridalPackageForm.featured}
                onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, featured: e.target.checked })}
              />
              Featured Package
            </label>
            <label className="input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={bridalPackageForm.popular}
                onChange={(e) => setBridalPackageForm({ ...bridalPackageForm, popular: e.target.checked })}
              />
              Most Popular
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" onClick={submitBridalPackage}>
              {bridalPackageForm.id ? 'Update Package' : 'Save Package'}
            </button>
            <button className="btn light" onClick={() => setBridalPackageForm(blankBridalPackage)}>
              Clear Form
            </button>
          </div>
        </section>

        <section className="table-card">
          <h2>All Bridal Packages</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Features</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bridalPackages.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No bridal packages found. Add one above.</td>
                </tr>
              ) : (
                bridalPackages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.name}</td>
                    <td>{money(pkg.price)}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {pkg.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      {pkg.featured && <span className="badge green">Featured</span>}
                      {pkg.popular && <span className="badge gold">Popular</span>}
                    </td>
                    <td>
                      <button onClick={() => editBridalPackage(pkg)}>Edit</button>
                      <button onClick={async () => {
                        if (confirm(`Delete ${pkg.name}?`)) {
                          await removeBridalPackage(pkg.id);
                          void recordAdminActivity({
                            action: 'Deleted Bridal Package',
                            description: `Deleted bridal package: ${pkg.name}.`,
                            targetType: 'bridalPackage',
                            targetId: String(pkg.id),
                          });
                          load();
                        }
                      }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="table-card" id="bridal-gallery" hidden={!can('content')}>
          <div className="admin-section-title">
            <div>
              <h2 className="admin-heading-with-icon"><Gem size={20} aria-hidden="true" /> Bridal Gallery</h2>
              <p>Manage the images in the bridal photo gallery.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="category-upload-box" style={{ gridColumn: '1 / -1' }}>
              <label>Upload New Image</label>
              <input type="file" accept="image/*" onChange={handleGalleryImageSelect} />
              {galleryImageFile && (
                <img src={galleryImageFile} alt="Preview" className="category-preview" style={{ marginTop: 12, width: 150, height: 150 }} />
              )}
            </div>
            <input
              className="input"
              placeholder="Optional: Image Caption"
              value={galleryImageCaption}
              onChange={(e) => setGalleryImageCaption(e.target.value)}
              style={{ gridColumn: '1 / -1' }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={handleGalleryImageUpload} disabled={isUploading || !galleryImageFile}>
              {isUploading ? 'Uploading...' : 'Upload to Gallery'}
            </button>
          </div>
        </section>

        <section className="table-card">
          <h2>All Gallery Images</h2>
          {bridalGalleryImages.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0' }}>No gallery images found. Upload one above.</p>
          ) : (
            <div className="admin-gallery-grid">
              {bridalGalleryImages.map(image => (
                <div key={image.id} className="admin-gallery-item">
                  <img src={image.imageUrl} alt={image.caption || 'Bridal gallery image'} />
                  <div className="admin-gallery-overlay">
                    <p>{image.caption}</p>
                    <button onClick={async () => {
                      if (confirm('Delete this image from the gallery?')) {
                        try {
                          await removeBridalGalleryImage(image);
                          void recordAdminActivity({
                            action: 'Deleted Gallery Image',
                            description: `Deleted bridal gallery image${image.caption ? `: ${image.caption}` : '.'}`,
                            targetType: 'gallery',
                            targetId: String(image.id),
                          });
                          showToast('Image deleted.', 'success');
                          load();
                        } catch (error) {
                          showToast('Failed to delete image.', 'error');
                        }
                      }
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="table-card" id="transformations-form" hidden={!can('content')}>
          <div className="admin-section-title">
            <div>
              <h2>Add/Edit Transformation</h2>
              <p>Showcase your work in the Before & After gallery.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <input
              className="input"
              placeholder="Title (e.g., Silk Press & Style)"
              value={transformationForm.data.title}
              onChange={(e) => setTransformationForm(p => ({ ...p, data: { ...p.data, title: e.target.value } }))}
            />
            <select
              className="input"
              value={transformationForm.data.category}
              onChange={(e) => setTransformationForm(p => ({ ...p, data: { ...p.data, category: e.target.value } }))}
            >
              {transformationCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <textarea
              className="input"
              placeholder="Optional: Description of the work done"
              value={transformationForm.data.description}
              onChange={(e) => setTransformationForm(p => ({ ...p, data: { ...p.data, description: e.target.value } }))}
              style={{ gridColumn: '1 / -1' }}
            />
            <div className="category-upload-box">
              <label>Before Image</label>
              <input type="file" accept="image/*" onChange={(e) => handleTransformationImageSelect(e, 'before')} />
              {(transformationForm.beforeImageFile || transformationForm.data.beforeImage) && (
                <img
                  src={transformationForm.beforeImageFile || transformationForm.data.beforeImage}
                  alt="Before preview"
                  className="category-preview"
                />
              )}
            </div>
            <div className="category-upload-box">
              <label>After Image</label>
              <input type="file" accept="image/*" onChange={(e) => handleTransformationImageSelect(e, 'after')} />
              {(transformationForm.afterImageFile || transformationForm.data.afterImage) && (
                <img
                  src={transformationForm.afterImageFile || transformationForm.data.afterImage}
                  alt="After preview"
                  className="category-preview"
                />
              )}
            </div>
            <label className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
              <input
                type="checkbox"
                checked={transformationForm.data.featured}
                onChange={(e) => setTransformationForm(p => ({ ...p, data: { ...p.data, featured: e.target.checked } }))}
              />
              Feature on Homepage
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" onClick={submitTransformation} disabled={isUploading}>
              {isUploading ? 'Saving...' : (transformationForm.data.id ? 'Update Transformation' : 'Save Transformation')}
            </button>
            <button className="btn light" onClick={() => setTransformationForm(blankTransformationForm)}>
              Clear Form
            </button>
          </div>
        </section>

        <section className="table-card">
          <h2>All Transformations</h2>
          {transformations.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0' }}>No transformations found. Add one above.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Before</th>
                  <th>After</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transformations.map(t => (
                  <tr key={t.id}>
                    <td>
                      <img
                        src={t.beforeImage}
                        alt="Before"
                        width={70}
                        height={70}
                        style={{ objectFit: 'cover', borderRadius: 10 }}
                      />
                    </td>
                    <td>
                      <img
                        src={t.afterImage}
                        alt="After"
                        width={70}
                        height={70}
                        style={{ objectFit: 'cover', borderRadius: 10 }}
                      />
                    </td>
                    <td>{t.title}</td>
                    <td>{t.category}</td>
                    <td>
                      {t.featured && <span className="badge green">Featured</span>}
                    </td>
                    <td>
                      <button onClick={() => editTransformation(t)}>Edit</button>
                      <button onClick={async () => {
                        if (confirm(`Delete transformation: "${t.title}"?`)) {
                          try {
                            await removeTransformation(t);
                            void recordAdminActivity({
                              action: 'Deleted Transformation',
                              description: `Deleted transformation: ${t.title}.`,
                              targetType: 'transformation',
                              targetId: String(t.id),
                            });
                            showToast('Transformation deleted.', 'success');
                            load();
                          } catch (error) {
                            showToast('Failed to delete transformation.', 'error');
                          }
                        }
                      }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="table-card" id="testimonials-form" hidden={!can('testimonials')}>
          <div className="admin-section-title">
            <div>
              <h2 className="admin-heading-with-icon"><MessageCircle size={20} aria-hidden="true" /> Add/Edit Testimonial</h2>
              <p>Manage customer testimonials for the homepage.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <input
              className="input"
              placeholder="Customer Name"
              value={testimonialForm.data.customerName}
              onChange={(e) => setTestimonialForm(p => ({ ...p, data: { ...p.data, customerName: e.target.value } }))}
            />
            <select
              className="input"
              value={testimonialForm.data.rating}
              onChange={(e) => setTestimonialForm(p => ({ ...p, data: { ...p.data, rating: Number(e.target.value) } }))}
            >
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
            <textarea
              className="input"
              placeholder="Testimonial text..."
              value={testimonialForm.data.testimonial}
              onChange={(e) => setTestimonialForm(p => ({ ...p, data: { ...p.data, testimonial: e.target.value } }))}
              style={{ gridColumn: '1 / -1', minHeight: '100px' }}
            />
            <div className="category-upload-box" style={{ gridColumn: '1 / -1' }}>
              <label>Optional: Customer Image</label>
              <input type="file" accept="image/*" onChange={handleTestimonialImageSelect} />
              {(testimonialForm.imageFile || testimonialForm.data.image) && (
                <img
                  src={testimonialForm.imageFile || testimonialForm.data.image}
                  alt="Customer preview"
                  className="category-preview"
                  style={{ width: 100, height: 100, borderRadius: '50%' }}
                />
              )}
            </div>
            <label className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
              <input
                type="checkbox"
                checked={testimonialForm.data.featured}
                onChange={(e) => setTestimonialForm(p => ({ ...p, data: { ...p.data, featured: e.target.checked } }))}
              />
              Feature on Homepage
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" onClick={submitTestimonial} disabled={isUploading}>
              {isUploading ? 'Saving...' : (testimonialForm.data.id ? 'Update Testimonial' : 'Save Testimonial')}
            </button>
            <button className="btn light" onClick={() => setTestimonialForm(blankTestimonialForm)}>
              Clear Form
            </button>
          </div>
        </section>

        <section className="table-card">
          <h2>All Testimonials</h2>
          {testimonials.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0' }}>No testimonials found. Add one above.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Testimonial</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map(t => (
                  <tr key={t.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={t.image || '/jayluxe-logo.png'}
                        alt={t.customerName}
                        width={40}
                        height={40}
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                      />
                      <strong>{t.customerName}</strong>
                    </td>
                    <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap' }}>{t.testimonial}</td>
                    <td>{'⭐'.repeat(t.rating)}</td>
                    <td>
                      {t.featured && <span className="badge green">Featured</span>}
                    </td>
                    <td>
                      <button onClick={() => editTestimonial(t)}>Edit</button>
                      <button onClick={async () => {
                        if (confirm(`Delete testimonial from "${t.customerName}"?`)) {
                          try {
                            await removeTestimonial(t);
                            void recordAdminActivity({
                              action: 'Deleted Testimonial',
                              description: `Deleted testimonial from ${t.customerName}.`,
                              targetType: 'testimonial',
                              targetId: String(t.id),
                            });
                            showToast('Testimonial deleted.', 'success');
                            load();
                          } catch (error) {
                            showToast('Failed to delete testimonial.', 'error');
                          }
                        }
                      }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="table-card admin-catalog-editor" id="products" hidden={!can('products')}>
          <div className="admin-section-title">
            <div>
              <h2>{form.id ? 'Edit Product or Service' : 'Add Product or Service'}</h2>
              <p>Keep product information, pricing, inventory and status clearly separated.</p>
            </div>
          </div>

          <div className="admin-product-form-sections">
            <fieldset className="admin-form-section">
              <legend>Product Information</legend>
              <div className="admin-form-grid">
                <label className="admin-field"><span>Name</span><input className="input" placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label className="admin-field"><span>Category</span><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select Category</option>{categories.filter((c) => c.active).map((cat) => <option key={String(cat.id)} value={cat.name}>{cat.name}</option>)}</select></label>
                <label className="admin-field"><span>Type</span><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'product' | 'service', sizes: e.target.value === 'service' ? [] : form.sizes })}><option value="product">Product</option><option value="service">Service</option></select></label>
                <label className="admin-field admin-field-wide"><span>Description</span><textarea className="input" rows={5} placeholder="Detailed product description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <div className="product-upload-box admin-field-wide admin-image-upload">
                  <div className="admin-image-upload-heading">
                    <div>
                      <label htmlFor="product-image-upload">Product Image</label>
                      <p className="admin-upload-note">JPEG, PNG or WebP, up to 8 MB. Images are stored in Firebase Storage.</p>
                    </div>
                    {form.image ? (
                      <div className="admin-image-preview-actions">
                        <label className="btn light admin-image-replace" htmlFor="product-image-upload" aria-disabled={isUploading}>Replace image</label>
                        <button className="btn light" type="button" disabled={isUploading} onClick={() => setForm((current) => ({ ...current, image: '' }))}>Remove image</button>
                      </div>
                    ) : null}
                  </div>
                  <input id="product-image-upload" className="admin-image-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading} onChange={uploadProductImage} />
                  {catalogUploadProgress.kind === 'products' ? (
                    <div className="admin-upload-progress" role="status" aria-live="polite">
                      <span>Uploading image… {catalogUploadProgress.percent}%</span>
                      <progress max="100" value={catalogUploadProgress.percent}>{catalogUploadProgress.percent}%</progress>
                    </div>
                  ) : null}
                  {form.image ? <img src={form.image} alt="Product preview" className="product-preview admin-image-preview" /> : <p className="admin-image-empty">Choose an image to add a storefront product thumbnail.</p>}
                </div>
              </div>
            </fieldset>

            <fieldset className="admin-form-section">
              <legend>Pricing</legend>
              <div className="admin-form-grid">
                <label className="admin-field"><span>Selling Price</span><input className="input" placeholder="Price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></label>
                <label className="admin-field"><span>Compare-at Price <small>Optional</small></span><input className="input" placeholder="Original price" type="number" min="0" value={form.oldPrice || ''} onChange={(e) => setForm({ ...form, oldPrice: e.target.value ? +e.target.value : undefined })} /></label>
              </div>
            </fieldset>

            <fieldset className="admin-form-section">
              <legend>Inventory</legend>
              <div className="admin-form-grid">
                <label className="admin-field"><span>Stock Quantity</span><input className="input" placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></label>
                {form.type === 'product' ? <div className="admin-field admin-field-wide"><span>Available Sizes</span><div className="admin-size-picker">{PRODUCT_SIZE_OPTIONS.map((size) => { const selected = form.sizes?.includes(size) || false; return <label key={size} className={selected ? 'selected' : ''}><input type="checkbox" checked={selected} onChange={(e) => setForm({ ...form, sizes: e.target.checked ? Array.from(new Set([...(form.sizes || []), size])) : (form.sizes || []).filter((item) => item !== size) })} /><span>{size}</span></label>; })}</div><small className="admin-help-text">Sizes are optional. Existing products without sizes continue to work normally.</small></div> : null}
              </div>
            </fieldset>

            <fieldset className="admin-form-section">
              <legend>Status</legend>
              <div className="admin-toggle-row">
                <label><input type="checkbox" checked={form.featured || false} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /><span>Featured</span></label>
                <label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>Active / available for sale</span></label>
              </div>
            </fieldset>
          </div>

          <div className="admin-form-actions">
            <button className="btn" onClick={submitProduct} disabled={isUploading}>{catalogUploadProgress.kind === 'products' ? `Uploading image… ${catalogUploadProgress.percent}%` : form.id ? 'Update Product / Service' : 'Save Product / Service'}</button>
            {form.id ? <button className="btn light" type="button" onClick={() => setForm(blankProduct)}>Cancel Edit</button> : null}
          </div>
        </section>

        <section className="table-card" id="inventory" hidden={!can('products')}>
          <div className="admin-section-title"><div><h2>Products &amp; Inventory</h2><p>Review descriptions, pricing, sizes, stock and availability at a glance.</p></div></div>
          <div className="admin-table-scroll">
            <table className="table admin-products-table">
              <thead><tr><th>Product</th><th>Description</th><th>Category</th><th>Price</th><th>Sizes</th><th>Availability</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginatedProducts.map((p) => {
                  const stock = Number(p.stock || 0);
                  const stockLabel = stock <= 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock' : 'Available';
                  const stockClass = stock <= 0 ? 'danger' : stock <= 5 ? 'warning' : 'success';
                  return (
                    <tr key={String(p.id)}>
                      <td><div className="admin-product-cell">{p.image ? <img src={p.image} alt="" /> : <span className="admin-product-image-placeholder"><Package2 size={18} aria-hidden="true" /></span>}<div><strong>{p.name}</strong><small>{p.type}</small></div></div></td>
                      <td className="admin-description-cell">{p.description || 'No description provided.'}</td>
                      <td>{p.category || '—'}</td>
                      <td><strong>{money(p.price)}</strong>{p.oldPrice && p.oldPrice > p.price ? <small className="admin-compare-price">{money(p.oldPrice)}</small> : null}</td>
                      <td>{p.sizes?.length ? <div className="admin-size-list">{p.sizes.map((size) => <span key={size}>{size}</span>)}</div> : <span className="admin-muted">Not set</span>}</td>
                      <td><span className={`admin-stock-status ${stockClass}`}><span aria-hidden="true" />{stockLabel}</span><small>{stock} in stock</small></td>
                      <td><span className={`badge ${p.active === false ? 'red' : 'green'}`}>{p.active === false ? 'Inactive' : 'Active'}</span></td>
                      <td><div className="admin-row-actions"><button onClick={() => { setForm({ ...p, sizes: p.sizes || [] }); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>Edit</button><button onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await removeProduct(p.id); void recordAdminActivity({ action: 'Deleted Product', description: `Deleted product or service: ${p.name}.`, targetType: 'product', targetId: String(p.id) }); showToast('Product deleted successfully', 'success'); load(); } }}>Delete</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination page={productsPage} totalPages={totalProductsPages} onPageChange={setProductsPage} label="Products" />
        </section>

        <section className="table-card" id="product-reviews" hidden={!can('products')}>
          <div className="admin-section-title"><div><h2>Product Reviews</h2><p>Customer product feedback is separate from general JayLuxe testimonials.</p></div><span className="badge gold">{productReviews.length} reviews</span></div>
          <div className="admin-table-scroll">
            <table className="table admin-reviews-table">
              <thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Purchase</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>{productReviews.length ? productReviews.map((review) => <tr key={review.id}><td>{review.customerName}</td><td>{products.find((product) => product.id === review.productId)?.name || review.productId}</td><td>{review.rating}/5</td><td className="admin-description-cell">{review.review}</td><td>{review.verifiedPurchase ? <span className="badge green">Verified</span> : <span className="badge">Customer</span>}</td><td>{new Date(review.createdAt).toLocaleDateString('en-NG')}</td><td><button onClick={() => void deleteProductReview(review)}>Delete</button></td></tr>) : <tr><td colSpan={7} className="admin-empty-cell">No product reviews yet.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <section className="table-card" id="orders" hidden={!can('orders')}>
          <div className="admin-section-title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2>Orders</h2>
              <p>Manage and process customer orders.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={exportOrdersCSV} className="btn light" style={{ whiteSpace: 'nowrap' }}>
                Download CSV
              </button>
              <input 
                className="input" 
                placeholder="Search ID, customer, ref..." 
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Total</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Est. Delivery</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center' }}>No orders found</td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={String(o.id)}>
                    <td>#{o.id}</td>
                    <td>{o.status || 'Processing'}</td>
                    <td>{money(Number(o.total || 0))}</td>
                    <td>{o.paymentMethod || 'Paystack'}</td>
                    <td>{o.paymentReference || 'N/A'}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A'}</td>
                    <td>{getEstimatedDeliveryDisplay(o)}</td>
                    <td>
                      <div style={{ display: 'grid', gap: 3, minWidth: 140, fontSize: 12 }}>
                        <span>Order: {o.confirmationEmailStatus || '—'}</span>
                        <span>Payment: {o.paymentEmailStatus || '—'}</span>
                        <span>Status: {o.statusEmailStatus || '—'}</span>
                        <span>Delivery: {o.lastEmailDeliveryStatus || '—'}</span>
                        {o.lastEmailProviderEvent ? <small>Provider: {o.lastEmailProviderEvent}</small> : null}
                        {o.lastEmailSentAt ? <small>Last sent: {new Date(o.lastEmailSentAt).toLocaleString()}</small> : null}
                        {o.confirmationEmailError || o.paymentEmailError || o.statusEmailError ? (
                          <small style={{ color: '#b42318', maxWidth: 220 }}>
                            {o.statusEmailError || o.paymentEmailError || o.confirmationEmailError}
                          </small>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <button onClick={() => window.open(`/invoice/${o.id}`, '_blank')}>View Invoice</button>
                      <button onClick={() => exportOrderInvoicePDF(o)}>Print Invoice</button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Processing?`)) {
                            void updateOrderStatusWithNotification(o, 'Processing');
                          }
                        }}
                      >
                        Process
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Ready for Shipment?`)) {
                            void updateOrderStatusWithNotification(o, 'Ready for Shipment');
                          }
                        }}
                      >
                        Ready
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Packed?`)) {
                            void updateOrderStatusWithNotification(o, 'Packed');
                          }
                        }}
                      >
                        Pack
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Shipped?`)) {
                            void updateOrderStatusWithNotification(o, 'Shipped');
                          }
                        }}
                      >
                        Ship
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Out for Delivery?`)) {
                            void updateOrderStatusWithNotification(o, 'Out for Delivery');
                          }
                        }}
                      >
                        Dispatch
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Mark order #${o.id} as Delivered?`)) {
                            void updateOrderStatusWithNotification(o, 'Delivered');
                          }
                        }}
                      >
                        Deliver
                      </button>
                      {o.paymentMethod === 'OPay' ? (
                        <button onClick={() => void handleRefund(o)}>Mark OPay Refunded</button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Cancel order #${o.id}?`)) {
                              void updateOrderStatusWithNotification(o, 'Cancelled');
                            }
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button onClick={() => void retryOrderEmails(String(o.id))}>Retry Email</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <button 
              className="btn light" 
              disabled={ordersPage === 1} 
              onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Page {ordersPage} of {totalOrdersPages}</span>
            <button 
              className="btn light" 
              disabled={ordersPage === totalOrdersPages} 
              onClick={() => setOrdersPage(p => Math.min(totalOrdersPages, p + 1))}
            >
              Next
            </button>
          </div>
        </section>

        <section className="table-card" id="bookings" hidden={!can('bookings')}>
          <h2>Bookings</h2>

          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }}>
                    No bookings yet
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={String(b.id)}>
                    <td>#{b.id}</td>
                    <td>{b.serviceName}</td>
                    <td>{b.customerName}</td>
                    <td>{b.customerPhone}</td>
                    <td>{b.date}</td>
                    <td>{b.time}</td>
                    <td>{b.status || 'Pending'}</td>
                    <td>
                      <button onClick={async () => { await updateBookingStatus(b.id, 'confirmed'); void recordAdminActivity({ action: 'Processed Booking', description: `Confirmed booking #${b.id}.`, targetType: 'booking', targetId: String(b.id) }); load(); }}>Confirm</button>
                      <button onClick={async () => { await updateBookingStatus(b.id, 'completed'); void recordAdminActivity({ action: 'Processed Booking', description: `Completed booking #${b.id}.`, targetType: 'booking', targetId: String(b.id) }); load(); }}>Complete</button>
                      <button onClick={async () => { await updateBookingStatus(b.id, 'cancelled'); void recordAdminActivity({ action: 'Processed Booking', description: `Cancelled booking #${b.id}.`, targetType: 'booking', targetId: String(b.id) }); load(); }}>Cancel</button>
                      <button onClick={async () => { if (confirm(`Delete booking #${b.id}?`)) { await removeBooking(b.id); void recordAdminActivity({ action: 'Deleted Booking', description: `Deleted booking #${b.id}.`, targetType: 'booking', targetId: String(b.id) }); load(); } }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="table-card" id="customers" hidden={!can('customers')}>
          <div className="admin-section-title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2>Customers</h2>
              <p>Manage customers and view their order history.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={exportCustomersCSV} className="btn light" style={{ whiteSpace: 'nowrap' }}>
                Download CSV
              </button>
              <input 
                className="input" 
                placeholder="Search name, email, phone..." 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Last Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>No customers found</td>
                  </tr>
                ) : (
                  paginatedCustomers.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.orderCount}</td>
                      <td>{money(c.totalSpent)}</td>
                      <td>{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button onClick={() => setSelectedCustomer(c)}>View Details</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <button 
              className="btn light" 
              disabled={customersPage === 1} 
              onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Page {customersPage} of {totalCustomersPages}</span>
            <button 
              className="btn light" 
              disabled={customersPage === totalCustomersPages} 
              onClick={() => setCustomersPage(p => Math.min(totalCustomersPages, p + 1))}
            >
              Next
            </button>
          </div>
        </section>

        <section className="table-card" id="coupons" hidden={!can('promotions')}>
          <h2>Coupons</h2>

          <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px',
    alignItems: 'end',
  }}
>
  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Coupon Code
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      The code customers will type at checkout, like WELCOME10.
    </p>

    <input
      className="input"
      placeholder="Example: WELCOME10"
      value={couponForm.code}
      onChange={(e) =>
        setCouponForm({
          ...couponForm,
          code: e.target.value.toUpperCase(),
        })
      }
    />
  </div>

  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Discount Amount
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      Enter the discount value. Example: 10 for 10% or ₦10.
    </p>

    <input
      className="input"
      placeholder="Example: 10"
      type="number"
      value={couponForm.discount}
      onChange={(e) =>
        setCouponForm({
          ...couponForm,
          discount: Number(e.target.value),
        })
      }
    />
  </div>

  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Discount Type
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      Choose percentage discount or fixed naira discount.
    </p>

    <select
      className="input"
      value={couponForm.type}
      onChange={(e) =>
        setCouponForm({
          ...couponForm,
          type: e.target.value,
        })
      }
    >
      <option value="percentage">Percentage</option>
      <option value="fixed">Fixed Amount</option>
    </select>
  </div>

  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Minimum Order
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      Minimum cart amount before this coupon can work.
    </p>

    <input
      className="input"
      placeholder="Example: 5000"
      type="number"
      value={couponForm.minOrder}
      onChange={(e) =>
        setCouponForm({
          ...couponForm,
          minOrder: Number(e.target.value),
        })
      }
    />
  </div>

  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Expiry Date
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      The date this coupon should stop working.
    </p>

    <input
      className="input"
      type="date"
      value={couponForm.expiryDate}
      onChange={(e) =>
        setCouponForm({
          ...couponForm,
          expiryDate: e.target.value,
        })
      }
    />
  </div>

  <div>
    <label
      style={{
        display: 'block',
        fontWeight: 800,
        marginBottom: '8px',
        color: '#111827',
      }}
    >
      Coupon Status
    </label>

    <p
      style={{
        margin: '0 0 8px',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      Turn this on if customers are allowed to use the coupon.
    </p>

    <label
      className="input"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <input
        type="checkbox"
        checked={couponForm.active}
        onChange={(e) =>
          setCouponForm({
            ...couponForm,
            active: e.target.checked,
          })
        }
      />
      Active Coupon
    </label>
  </div>
</div>

          <br />

          <button className="btn" onClick={submitCoupon}>Save Coupon</button>

          <table className="table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Expiry</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((c) => (
                <tr key={String(c.id)}>
                  <td>{c.code}</td>
                  <td>{c.discount}</td>
                  <td>{money(Number(c.minOrder || 0))}</td>
                  <td>{c.expiryDate}</td>
                  <td>
                    <button onClick={() => setCouponForm({
                      id: c.id,
                      code: c.code,
                      discount: c.discount,
                      type: c.type || 'percentage',
                      minOrder: c.minOrder || 0,
                      expiryDate: c.expiryDate || '',
                      active: c.active ?? true,
                    })}>Edit</button>
                    <button onClick={async () => {
                      if (confirm(`Delete coupon ${c.code}?`)) {
                        await removeCoupon(c.id);
                        void recordAdminActivity({
                          action: 'Deleted Promotion',
                          description: `Deleted promotion code ${c.code}.`,
                          targetType: 'promotion',
                          targetId: String(c.id),
                        });
                        showToast('Promotion deleted successfully', 'success');
                        load();
                      }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="table-card" id="contact-messages" hidden={!can('orders')}>
          <div className="admin-section-title">
            <div>
              <h2>Contact Messages</h2>
              <p>Messages saved by the website contact form and their email-delivery status.</p>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Email</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {contactMessages.slice(0, 50).map((message) => (
                <tr key={message.id}>
                  <td>
                    <strong>{message.name || 'Customer'}</strong><br />
                    <small>{message.email || 'No email'}</small>
                  </td>
                  <td>{message.subject || 'Enquiry'}</td>
                  <td className="admin-message-cell">{message.message || '—'}</td>
                  <td>{message.emailStatus || 'pending'}</td>
                  <td>{firestoreDate(message.createdAt)?.toLocaleString() || 'N/A'}</td>
                </tr>
              ))}
              {contactMessages.length === 0 ? (
                <tr><td colSpan={5}>No contact messages have been recorded.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="table-card" id="sms-logs" hidden={!can('orders')}>
          <div className="admin-section-title">
            <div>
              <h2>SMS Logs</h2>
              <p>Termii customer and business notification attempts.</p>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Recipient</th>
                <th>Event</th>
                <th>Status</th>
                <th>Error</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {smsLogs.slice(0, 100).map((log) => (
                <tr key={log.id}>
                  <td>#{log.orderId || 'N/A'}</td>
                  <td>{log.recipientType || 'customer'}<br /><small>{log.phone || ''}</small></td>
                  <td>{log.orderStatus || log.event || 'SMS'}</td>
                  <td>{log.status || 'unknown'}</td>
                  <td className="admin-message-cell">{log.error || '—'}</td>
                  <td>{firestoreDate(log.createdAt)?.toLocaleString() || 'N/A'}</td>
                </tr>
              ))}
              {smsLogs.length === 0 ? (
                <tr><td colSpan={6}>No SMS logs have been recorded.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </main>

      {selectedCustomer && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="modal-content table-card" style={{ maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h2 style={{ margin: 0 }}>Customer Details</h2>
                <button onClick={exportCustomerPDF} className="btn light" style={{ padding: '6px 12px', fontSize: 14 }}>Export PDF</button>
              </div>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#333' }}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
              <div>
                <p style={{ margin: '4px 0' }}><strong>Name:</strong> {selectedCustomer.name}</p>
                <p style={{ margin: '4px 0' }}><strong>Email:</strong> {selectedCustomer.email}</p>
                <p style={{ margin: '4px 0' }}><strong>Phone:</strong> {selectedCustomer.phone}</p>
                <p style={{ margin: '4px 0' }}><strong>Address:</strong> {selectedCustomer.address}</p>
              </div>
              <div>
                <p style={{ margin: '4px 0' }}><strong>Total Orders:</strong> {selectedCustomer.orderCount}</p>
                <p style={{ margin: '4px 0' }}><strong>Total Spent:</strong> {money(selectedCustomer.totalSpent)}</p>
                <p style={{ margin: '4px 0' }}><strong>Last Order:</strong> {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            <h3>Order History</h3>
            {selectedCustomer.orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.orders.map(o => (
                      <tr key={String(o.id)}>
                        <td>#{o.id}</td>
                        <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={o.status === 'Delivered' ? 'badge green' : o.status === 'Cancelled' ? 'badge red' : 'badge gold'}>
                            {o.status || 'Processing'}
                          </span>
                        </td>
                        <td>{money(Number(o.total || 0))}</td>
                        <td><button onClick={() => window.open(`/invoice/${o.id}`, '_blank')}>View Invoice</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}