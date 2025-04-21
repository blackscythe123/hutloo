from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, FloatField, SelectField, DateTimeField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError, Length, Optional
from models import User

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    # Removed role field
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')
    
    # Removed validate_role method


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    password2 = PasswordField('Repeat Password', validators=[DataRequired(), EqualTo('password')])
    role = SelectField('Register As', choices=[
        ('customer', 'Customer'),
        ('driver', 'Driver'),
        ('admin', 'Admin')
    ], validators=[DataRequired()])
    license_number = StringField('License Number', validators=[Optional(), Length(max=50)])
    phone = StringField('Phone Number', validators=[Optional(), Length(max=20)])
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Please use a different username.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Please use a different email address.')
            
    def validate_role(self, role):
        if role.data == 'driver':
            if not self.license_number.data or not self.phone.data:
                raise ValidationError('License number and phone are required for drivers.')


class OrderForm(FlaskForm):
    pickup_address = StringField('Pickup Address', validators=[DataRequired(), Length(max=255)])
    pickup_lat = FloatField('Pickup Latitude', validators=[DataRequired()])
    pickup_lng = FloatField('Pickup Longitude', validators=[DataRequired()])
    delivery_address = StringField('Delivery Address', validators=[DataRequired(), Length(max=255)])
    delivery_lat = FloatField('Delivery Latitude', validators=[DataRequired()])
    delivery_lng = FloatField('Delivery Longitude', validators=[DataRequired()])
    package_weight = FloatField('Package Weight (kg)', validators=[DataRequired()])
    package_description = TextAreaField('Package Description', validators=[Optional(), Length(max=500)])
    scheduled_pickup = DateTimeField('Scheduled Pickup', validators=[Optional()], format='%Y-%m-%dT%H:%M')
    scheduled_delivery = DateTimeField('Scheduled Delivery', validators=[Optional()], format='%Y-%m-%dT%H:%M')
    submit = SubmitField('Create Order')

class TrackOrderForm(FlaskForm):
    order_number = StringField('Order Number', validators=[DataRequired(), Length(min=8, max=20)])
    submit = SubmitField('Track Order')

class DriverForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    license_number = StringField('License Number', validators=[DataRequired(), Length(max=50)])
    phone = StringField('Phone Number', validators=[DataRequired(), Length(max=20)])
    submit = SubmitField('Add Driver')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Please use a different username.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Please use a different email address.')

class VehicleForm(FlaskForm):
    driver_id = SelectField('Driver', coerce=int, validators=[DataRequired()])
    type = SelectField('Vehicle Type', choices=[
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('car', 'Car')
    ], validators=[DataRequired()])
    license_plate = StringField('License Plate', validators=[DataRequired(), Length(max=20)])
    capacity = FloatField('Capacity (kg)', validators=[DataRequired()])
    submit = SubmitField('Add Vehicle')
