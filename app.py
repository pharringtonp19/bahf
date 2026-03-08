"""Flask app for Boston Affordable Housing Inventory."""

from flask import Flask, jsonify, render_template
from data import load_housing_data, compute_stats, get_filter_options
from boston_boundary import BOSTON_BOUNDARY

app = Flask(__name__)

# Load data once at startup
housing_data = load_housing_data()
housing_stats = compute_stats(housing_data)
geocoded_count = sum(1 for r in housing_data if r.get("Latitude") and r.get("Longitude"))


@app.route("/")
def index():
    return render_template("home.html", stats=housing_stats)


@app.route("/map")
def housing_map():
    return render_template(
        "map.html",
        total=len(housing_data),
        geocoded_count=geocoded_count,
    )



@app.route("/api/housing")
def api_housing():
    return jsonify(housing_data)


@app.route("/api/boundary")
def api_boundary():
    return jsonify(BOSTON_BOUNDARY)


if __name__ == "__main__":
    app.run(debug=True, port=5050)
