/* Built-in foods, per 100 g (USDA FoodData Central / SR Legacy values unless
   noted). s = common serving [label, grams]. a = alcohol grams.
   Packaged foods vary — for those, use the label or the online search. */
(function (root) {
  "use strict";
  var FOODS = [
    // Grains & staples
    { id: "rice_white", name: "Rice, white, cooked", kcal: 130, p: 2.7, c: 28.2, f: 0.3, s: ["1 cup", 158] },
    { id: "rice_brown", name: "Rice, brown, cooked", kcal: 112, p: 2.3, c: 23.5, f: 0.8, s: ["1 cup", 195] },
    { id: "roti", name: "Chapati / roti, whole wheat", kcal: 297, p: 11, c: 46, f: 7.5, s: ["1 roti", 40] },
    { id: "bread_ww", name: "Bread, whole wheat", kcal: 252, p: 12.4, c: 42.7, f: 3.5, s: ["1 slice", 32] },
    { id: "bread_white", name: "Bread, white", kcal: 266, p: 7.6, c: 50.6, f: 3.3, s: ["1 slice", 27] },
    { id: "pasta", name: "Pasta, cooked", kcal: 158, p: 5.8, c: 30.9, f: 0.9, s: ["1 cup", 140] },
    { id: "oats", name: "Oats, rolled, dry", kcal: 379, p: 13.2, c: 67.7, f: 6.5, s: ["½ cup", 40] },
    { id: "potato", name: "Potato, boiled", kcal: 86, p: 1.7, c: 20, f: 0.1, s: ["1 medium", 150] },
    { id: "sweet_potato", name: "Sweet potato, baked", kcal: 90, p: 2, c: 20.7, f: 0.2, s: ["1 medium", 114] },
    // Protein
    { id: "egg", name: "Egg, whole, boiled", kcal: 155, p: 12.6, c: 1.1, f: 10.6, s: ["1 large egg", 50] },
    { id: "egg_white", name: "Egg white", kcal: 52, p: 10.9, c: 0.7, f: 0.2, s: ["1 large white", 33] },
    { id: "chicken_breast", name: "Chicken breast, cooked, skinless", kcal: 165, p: 31, c: 0, f: 3.6, s: ["1 palm-size piece", 120] },
    { id: "chicken_thigh", name: "Chicken thigh, cooked, skinless", kcal: 209, p: 25.9, c: 0, f: 10.9, s: ["1 thigh", 90] },
    { id: "beef_mince", name: "Beef mince 90% lean, cooked", kcal: 217, p: 26.1, c: 0, f: 11.7 },
    { id: "salmon", name: "Salmon, cooked", kcal: 206, p: 22.1, c: 0, f: 12.4, s: ["1 fillet", 150] },
    { id: "white_fish", name: "White fish (cod), cooked", kcal: 105, p: 22.8, c: 0, f: 0.9, s: ["1 fillet", 150] },
    { id: "tuna", name: "Tuna, canned in water, drained", kcal: 116, p: 25.5, c: 0, f: 0.8, s: ["1 can", 142] },
    { id: "prawns", name: "Prawns, cooked", kcal: 99, p: 24, c: 0.2, f: 0.3 },
    { id: "paneer", name: "Paneer", kcal: 288, p: 18.9, c: 1.2, f: 22.5, s: ["1 cube (~25 g)", 25] },
    { id: "tofu", name: "Tofu, firm", kcal: 144, p: 15.8, c: 4.3, f: 8.7 },
    { id: "whey", name: "Whey protein powder (typical)", kcal: 400, p: 80, c: 10, f: 5, s: ["1 scoop", 30] },
    // Legumes
    { id: "lentils", name: "Lentils / dhal, boiled", kcal: 116, p: 9, c: 20.1, f: 0.4, s: ["1 cup", 198] },
    { id: "chickpeas", name: "Chickpeas, boiled", kcal: 164, p: 8.9, c: 27.4, f: 2.6, s: ["1 cup", 164] },
    { id: "kidney_beans", name: "Kidney beans, boiled", kcal: 127, p: 8.7, c: 22.8, f: 0.5, s: ["1 cup", 177] },
    // Dairy & fats
    { id: "milk_whole", name: "Milk, whole", kcal: 61, p: 3.2, c: 4.8, f: 3.3, s: ["1 glass (250 ml)", 258] },
    { id: "milk_low", name: "Milk, low-fat 1%", kcal: 42, p: 3.4, c: 5, f: 1, s: ["1 glass (250 ml)", 258] },
    { id: "curd", name: "Yogurt / curd, whole milk", kcal: 61, p: 3.5, c: 4.7, f: 3.3, s: ["1 cup", 245] },
    { id: "greek_yogurt", name: "Greek yogurt, non-fat", kcal: 59, p: 10.2, c: 3.6, f: 0.4, s: ["1 pot", 170] },
    { id: "cheddar", name: "Cheddar cheese", kcal: 403, p: 24.9, c: 1.3, f: 33.1, s: ["1 slice", 28] },
    { id: "butter", name: "Butter", kcal: 717, p: 0.9, c: 0.1, f: 81.1, s: ["1 tsp", 5] },
    { id: "ghee", name: "Ghee", kcal: 876, p: 0.3, c: 0, f: 99.5, s: ["1 tsp", 5] },
    { id: "oil", name: "Cooking oil (any)", kcal: 884, p: 0, c: 0, f: 100, s: ["1 tbsp", 14] },
    { id: "coconut_oil", name: "Coconut oil", kcal: 892, p: 0, c: 0, f: 99.1, s: ["1 tbsp", 14] },
    { id: "coconut_milk", name: "Coconut milk, canned", kcal: 197, p: 2, c: 2.8, f: 21.3, s: ["¼ cup", 60] },
    { id: "coconut_fresh", name: "Coconut, fresh grated", kcal: 354, p: 3.3, c: 15.2, f: 33.5, s: ["2 tbsp", 15] },
    { id: "avocado", name: "Avocado", kcal: 160, p: 2, c: 8.5, f: 14.7, s: ["½ avocado", 68] },
    // Nuts
    { id: "peanut_butter", name: "Peanut butter", kcal: 588, p: 25.1, c: 19.6, f: 50.4, s: ["1 tbsp", 16] },
    { id: "peanuts", name: "Peanuts", kcal: 567, p: 25.8, c: 16.1, f: 49.2, s: ["small handful", 28] },
    { id: "almonds", name: "Almonds", kcal: 579, p: 21.2, c: 21.6, f: 49.9, s: ["small handful", 28] },
    { id: "cashews", name: "Cashews", kcal: 553, p: 18.2, c: 30.2, f: 43.9, s: ["small handful", 28] },
    // Fruit & veg
    { id: "banana", name: "Banana", kcal: 89, p: 1.1, c: 22.8, f: 0.3, s: ["1 medium", 118] },
    { id: "apple", name: "Apple", kcal: 52, p: 0.3, c: 13.8, f: 0.2, s: ["1 medium", 182] },
    { id: "orange", name: "Orange", kcal: 47, p: 0.9, c: 11.8, f: 0.1, s: ["1 medium", 131] },
    { id: "mango", name: "Mango", kcal: 60, p: 0.8, c: 15, f: 0.4, s: ["1 cup sliced", 165] },
    { id: "papaya", name: "Papaya", kcal: 43, p: 0.5, c: 10.8, f: 0.3, s: ["1 cup", 145] },
    { id: "pineapple", name: "Pineapple", kcal: 50, p: 0.5, c: 13.1, f: 0.1, s: ["1 cup", 165] },
    { id: "grapes", name: "Grapes", kcal: 69, p: 0.7, c: 18.1, f: 0.2, s: ["1 cup", 151] },
    { id: "broccoli", name: "Broccoli, cooked", kcal: 35, p: 2.4, c: 7.2, f: 0.4, s: ["1 cup", 156] },
    { id: "spinach", name: "Spinach, raw", kcal: 23, p: 2.9, c: 3.6, f: 0.4, s: ["1 cup", 30] },
    { id: "carrot", name: "Carrot", kcal: 41, p: 0.9, c: 9.6, f: 0.2, s: ["1 medium", 61] },
    { id: "tomato", name: "Tomato", kcal: 18, p: 0.9, c: 3.9, f: 0.2, s: ["1 medium", 123] },
    { id: "cucumber", name: "Cucumber", kcal: 15, p: 0.7, c: 3.6, f: 0.1 },
    { id: "onion", name: "Onion", kcal: 40, p: 1.1, c: 9.3, f: 0.1, s: ["1 medium", 110] },
    // Sweet & drinks
    { id: "sugar", name: "Sugar", kcal: 387, p: 0, c: 100, f: 0, s: ["1 tsp", 4] },
    { id: "honey", name: "Honey", kcal: 304, p: 0.3, c: 82.4, f: 0, s: ["1 tbsp", 21] },
    { id: "dark_choc", name: "Dark chocolate 70–85%", kcal: 598, p: 7.8, c: 45.9, f: 42.6, s: ["2 squares", 20] },
    { id: "cola", name: "Cola", kcal: 42, p: 0, c: 10.6, f: 0, s: ["1 can (330 ml)", 330] },
    { id: "oj", name: "Orange juice", kcal: 45, p: 0.7, c: 10.4, f: 0.2, s: ["1 glass (250 ml)", 250] },
    { id: "beer", name: "Beer, regular", kcal: 43, p: 0.5, c: 3.6, f: 0, a: 3.9, s: ["1 bottle (330 ml)", 330] },
    { id: "wine", name: "Wine, red", kcal: 85, p: 0.1, c: 2.6, f: 0, a: 10.6, s: ["1 glass (150 ml)", 150] }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = FOODS;
  else root.FOODS = FOODS;
})(this);
