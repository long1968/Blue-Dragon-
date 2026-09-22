# Ai Là Triệu Phú – Giá trị Úc

Game luyện thi **Australian Citizenship – Australian Values** bằng tiếng Việt và tiếng Anh.

## Chơi trực tiếp

- https://millionaire-australian-values.ln162618.chatgpt.site

## Tính năng

- Ngân hàng đủ 65 câu song ngữ Anh–Việt.
- Mỗi lượt chọn 15 câu: 5 dễ, 5 trung bình, 5 khó.
- Bốn đáp án A/B/C/D.
- Ba quyền trợ giúp: 50:50, Hỏi ChatGPT và Đổi câu cùng cấp độ.
- Mốc an toàn tại câu 5 và câu 10.
- Dùng được trên điện thoại; hỗ trợ bàn phím A/B/C/D.
- Một file `index.html`, có thể mở ngoại tuyến.

## Chạy game

Tải repository rồi mở `index.html` bằng trình duyệt. Game không cần cài đặt và không cần máy chủ.

## Kiểm thử

Yêu cầu Node.js:

```bash
node tests/validate-game.mjs
node tests/dom-smoke.mjs
```

Nội dung đã được đối chiếu 65/65 câu hỏi và đáp án đúng với tài liệu nguồn song ngữ.
