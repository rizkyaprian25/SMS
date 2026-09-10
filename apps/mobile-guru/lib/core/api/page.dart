/// Model generik untuk semua response list paginated backend.
/// Backend selalu { data: [...], meta: { total, page, limit, totalPages } }.
class PageMeta {
  const PageMeta({
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory PageMeta.fromJson(Map<String, dynamic> json) => PageMeta(
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        limit: json['limit'] as int? ?? 30,
        totalPages: json['totalPages'] as int? ?? 1,
      );

  final int total;
  final int page;
  final int limit;
  final int totalPages;
}

class Page<T> {
  const Page({required this.data, required this.meta});

  factory Page.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromItem,
  ) {
    final items = (json['data'] as List? ?? [])
        .map((e) => fromItem(e as Map<String, dynamic>))
        .toList();
    return Page(
      data: items,
      meta: PageMeta.fromJson(json['meta'] as Map<String, dynamic>? ?? {}),
    );
  }

  final List<T> data;
  final PageMeta meta;
}
