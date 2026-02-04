export const ERRORS_AR = {
  ACCOUNT_NOT_FOUND: "هذا الحساب غير موجود",
  ITEM_NOT_FOUND: "هذا المنتج غير موجود",
  ITEM_ARCHIVED: "تمت أرشفة هذا المنتج",
  ITEM_NOT_FOUND_OR_ARCHIVED: "لا يمكن ايجاد هذا المنتج",
  INVALID_QUANTITY: {
    TITLE: "كمية خاطئة",
    DESCRIPTION: {
      ZERO_QUANTITY: "لا يمكنك شراء 0 من المنتج, قم بإدخال عدد موجب",

      INSUFFICIENT_STOCK: "الكمية المطلوبة أكثر من المتوفرة",
    },
  },
  INVALID_OPERATION: "عملية خاطئة ",
  BALANCE_NOT_FOUND:
    "لا يوجد طرق دفع, الرجاء اضافة طريقة دفع من اعدادات الشراء",
  INSUFFICIENT_FUNDS: "رصيدك غير كافي",
} as const;
